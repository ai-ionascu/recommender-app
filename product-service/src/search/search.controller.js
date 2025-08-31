import { es, INDEX_ALIAS } from './esClient.js';

/**
 GET /search
 Query params:
    q, category, country, grape, year, minPrice, maxPrice, inStock (t/f),
    sort = relevance|price_asc|price_desc|popularity|newest,
    page 1..., size default 12
 */
export async function search(req, res, next) {
  try {
    const {
      q = '',
      sort = 'relevance',
      page = 1,
      size = 12,
      category,
      country,
      countries,
      grape,
      grapes,
      year,
      inStock,
      minPrice,
      maxPrice,
    } = req.query;

    const toArray = (v) => {
      if (!v) return [];
      if (Array.isArray(v)) return v.flatMap(x => String(x).split(','));
      return String(v).split(',');
    };
    const normList = (arr) =>
      Array.from(new Set(arr.map(s => String(s).trim()).filter(Boolean)));

    const countriesArr = normList([ ...toArray(country), ...toArray(countries) ]);
    const grapesArr    = normList([ ...toArray(grape),   ...toArray(grapes)   ]);

    const from = Math.max(0, (Number(page) - 1) * Number(size));

    const term = q.trim();
    const L = term.length;
    const qLower = term.toLowerCase();

    // fallback without diacritics (wildcard/term not analyzing query)
    const termNoDiac = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const hasDiacritics = term && termNoDiac !== term;

    // no prefix on name - handled by autocomplete
    const shouldQueries = term ? [
      // name as exact phrase (analyzed)
      { match_phrase: { name: { query: term, slop: 0, _name: 'name_phrase' } } },
      // wine_type exact keyword
      { term: { 'wines.wine_type': { value: qLower, case_insensitive: true, _name: 'wine_type' } } },
      // features as phrase
      { match_phrase: { 'features.value': { query: term, _name: 'feature_phrase' } } },
    ] : [];

    // fallback diacritics - ascii on keywords (helps rosé -> rose if data is without accents)
    if (term && hasDiacritics && L >= 3) {
      shouldQueries.push(
        { match_phrase: { name: { query: termNoDiac, slop: 0, _name: 'name_phrase_ascii' } } },
        { match_phrase: { 'features.value': { query: termNoDiac, _name: 'feature_phrase_ascii' } } }
      );
      // ascii fallback for wine_type keyword
      shouldQueries.push(
        { term: { 'wines.wine_type': { value: termNoDiac.toLowerCase(), case_insensitive: true, _name: 'wine_type_ascii' } } }
      );
    }

    // fuzzy typo tolerance when useful
    if (term && L <= 20) {
      const fuzzyFields = [
        'name^6',
        'search_blob^3',
        'description',
        'highlight',
        'features.value^2',
        'wines.grape_variety^2',
        'country',
        'region'
      ];
      shouldQueries.push({
        multi_match: {
          query: term,
          type: 'most_fields',
          fuzziness: 'AUTO',
          fields: fuzzyFields,
          _name: 'fuzzy_multi_match'
        }
      });
      if (hasDiacritics) {
        shouldQueries.push({
          multi_match: {
            query: termNoDiac,
            type: 'most_fields',
            fuzziness: 'AUTO',
            fields: fuzzyFields,
            _name: 'fuzzy_multi_match_ascii'
          }
        });
      }
    }

    let sortSpec;
    switch (sort) {
      case 'price_asc':  sortSpec = [{ price: 'asc' }]; break;
      case 'price_desc': sortSpec = [{ price: 'desc' }]; break;
      case 'popularity': sortSpec = [{ sales_30d: 'desc' }, { popularity: 'desc' }]; break;
      case 'newest':     sortSpec = [{ created_at: 'desc' }]; break;
      default:           sortSpec = ['_score'];
    }

    const filters = [];
    if (category) filters.push({ term: { category } });

    if (countriesArr.length) {
      filters.push({
        bool: {
          should: [
            { terms: { 'country.keyword': countriesArr } },           // exact (case-sensitive)
            ...countriesArr.map(c => ({ match: { country: c } })),    // analizat (case-insensitive)
          ],
          minimum_should_match: 1,
        }
      });
    }

    if (grapesArr.length) {
      filters.push({
        bool: {
          should: [
            { terms: { 'wines.grape_variety.keyword': grapesArr } },           // exact (case-sensitive)
            ...grapesArr.map(g => ({ match: { 'wines.grape_variety': g } })),  // analizat (case-insensitive)
          ],
          minimum_should_match: 1,
        }
      });
    }

    if (year) {
      filters.push({ term: { 'wines.vintage': Number(year) } });
    }

    if (inStock === 'true') {
      filters.push({ range: { stock: { gt: 0 } } });
    }

    if (minPrice != null || maxPrice != null) {
      const range = {};
      if (minPrice != null) range.gte = Number(minPrice);
      if (maxPrice != null) range.lte = Number(maxPrice);
      filters.push({ range: { price: range } });
    }

    const must = term
      ? [{ bool: { should: shouldQueries, minimum_should_match: 1 } }]
      : [{ match_all: {} }];

    const body = {
      from,
      size: Number(size),
      query: {
        bool: {
          must,
          filter: filters,
        }
      },
      sort: sortSpec,
      _source: [
        'id','slug','name','price','stock','country','region','category',
        'images','reviews','wines','spirits','beers','accessories',
        'popularity','sales_30d','featured','created_at'
      ],

      // facets / aggregations
      aggs: {
        by_country: { terms: { field: 'country.keyword', size: 20 } },                 // ← keyword
        by_grape:   { terms: { field: 'wines.grape_variety.keyword', size: 20 } },     // ← keyword
        price_ranges: {
          range: {
            field: 'price',
            ranges: [
              { to: 30 }, { from: 30, to: 60 }, { from: 60, to: 100 }, { from: 100 }
            ]
          }
        }
      },

      // highlight (including grape_variety)
      highlight: {
        fields: {
          name: {},
          description: {},
          'features.value': {},
          'wines.grape_variety': {}
        },
        number_of_fragments: 0,
        pre_tags: ['<mark>'],
        post_tags: ['</mark>']
      }
    };

    const resp = await es.search({ index: INDEX_ALIAS, body });

    const aggs = resp.aggregations || {};
    const items = (resp.hits.hits || []).map(h => ({
      _score: h._score,
      highlight: h.highlight || null,
      ...h._source
    }));

    res.json({
      total: resp.hits.total?.value ?? 0,
      items,
      facets: {
        country: aggs.by_country?.buckets || [],
        grape:   aggs.by_grape?.buckets || [],
        price:   aggs.price_ranges?.buckets || []
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 GET /search/autocomplete
 Query params: q, size (default 8)
 Returning id, name, slug, main image if exists.
 */
export async function autocomplete(req, res, next) {
  try {
    const { q = '', size = 8 } = req.query;
    const term = String(q).trim();
    if (!term) return res.json({ items: [] });

    const termNoDiac = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const hasDiacritics = term && termNoDiac !== term;

    const should = [
      // name.auto (edge_ngram) – prefix-friendly (analyzed with asciifolding)
      { match: { 'name.auto': { query: term, operator: 'and', _name: 'name_auto' } } },
      // prefix on name (for phrases with spaces)
      { match_phrase_prefix: { name: { query: term, _name: 'name_prefix' } } },
      // keyword fields – prefix via wildcard
      { wildcard: { 'wines.grape_variety': { value: `${term}*`, case_insensitive: true, _name: 'grape_variety' } } },
      { wildcard: { country:               { value: `${term}*`, case_insensitive: true, _name: 'country' } } },
      { wildcard: { region:                { value: `${term}*`, case_insensitive: true, _name: 'region' } } },
      // text field – prefix tolerant
      { match_phrase_prefix: { 'features.value': { query: term, _name: 'feature_prefix' } } }
    ];

    // fallbaack diacritics - ascii on wildcards for keywords
    if (hasDiacritics) {
      should.push(
        { wildcard: { 'wines.grape_variety': { value: `${termNoDiac}*`, case_insensitive: true, _name: 'grape_variety_ascii' } } },
        { wildcard: { country:               { value: `${termNoDiac}*`, case_insensitive: true, _name: 'country_ascii' } } },
        { wildcard: { region:                { value: `${termNoDiac}*`, case_insensitive: true, _name: 'region_ascii' } } },
        { match: { 'name.auto': { query: termNoDiac, operator: 'and', _name: 'name_auto_ascii' } } },
        { match_phrase_prefix: { name: { query: termNoDiac, _name: 'name_prefix_ascii' } } }
      );
    }

    const body = {
      size: Number(size),
      _source: ['id','name','slug','images'],
      query: { bool: { should, minimum_should_match: 1 } }
    };

    const resp = await es.search({ index: INDEX_ALIAS, body });
    const items = (resp.hits.hits || []).map(h => {
      const src = h._source;
      const mainImage = Array.isArray(src.images)
        ? (src.images.find(i => i.is_main) || src.images[0] || null)
        : null;
      return {
        id: src.id,
        name: src.name,
        slug: src.slug,
        image: mainImage?.url || null,
        matchedOn: h.matched_queries || []
      };
    });

    return res.json({ items });
  } catch (err) {
    next(err);
  }
}
