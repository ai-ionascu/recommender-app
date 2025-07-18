import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const ImageUploader = ({ productId, formData, productImages, onImagesUpdate }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [replaceTargetUrl, setReplaceTargetUrl] = useState(null);
  const [tempDummyImage, setTempDummyImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Store batch of fetched images for current category
  const [imageBatch, setImageBatch] = useState([]);
  const lastCategoryRef = useRef(''); // track last used category to reset image batch

  // Valid wine types for specific search term mapping
  const wineTypes = ['red', 'white', 'rose', 'sparkling', 'dessert'];

  // Define mapping from category/subtype to image search terms
  const searchTerms = {
    wine: {
      red: 'red wine bottle',
      white: 'white wine bottle',
      rose: 'rose wine bottle',
      sparkling: 'sparkling wine bottle',
      dessert: 'dessert wine bottle'
    },
    spirits: {
      whiskey: 'whiskey bottle',
      vodka: 'vodka bottle',
      gin: 'gin bottle',
      rhum: 'rhum bottle',
      tequila: 'tequila bottle',
      brandy: 'brandy bottle'
    },
    beer: 'beer bottle',
    accessories: 'drink accessories'
  };

  // Additional search term mappings for accessories based on drink type
  const accessoryTerms = {
    wine: {
      glassware: 'wine glasses',
      decanter: 'wine decanter',
      opener: 'cork screw',
      gift_set: 'wine gift set'
    },
    spirits: {
      glassware: 'whiskey glasses',
      decanter: 'whiskey decanter',
      opener: 'bottle stopper',
      gift_set: 'whiskey gift set'
    },
    beer: {
      glassware: 'beer mugs',
      decanter: 'beer growler',
      opener: 'beer opener',
      gift_set: 'beer gift set'
    }
  };

  // Build search query depending on category and subtype
  const getSearchQuery = () => {
    if (!formData.category) return null;

    if (formData.category === 'wine') {
      const wineType = formData.wine_type?.toLowerCase();
      if (wineTypes.includes(wineType)) {
        return searchTerms.wine[wineType];
      }
      return 'wine bottle';
    }

    if (formData.category === 'spirits') {
      const spiritType = formData.spirit_type?.toLowerCase();
      return searchTerms.spirits[spiritType] || 'whiskey bottle';
    }

    if (formData.category === 'accessories') {
      const drinkType = formData.compatible_with_product_type?.toLowerCase();
      const accessoryType = formData.accessory_type?.toLowerCase();
      return accessoryTerms[drinkType]?.[accessoryType] || 'drink accessories';
    }

    return searchTerms[formData.category] || 'wine bottle';
  };

    // form data category change -> reset image batch
  useEffect(() => {
    const currentQuery = getSearchQuery();
    if (currentQuery !== lastCategoryRef.current) {
      lastCategoryRef.current = currentQuery;
      setImageBatch([]);
      setTempDummyImage(null);
      setGenerationError(null);
    }
  }, [formData]);

  // batch of dummy images from API
  const fetchNewBatch = async (query) => {
    const perPage = 50;
    const randomPage = Math.floor(Math.random() * 50) + 1;
    const res = await axios.get(`${VITE_API_URL}/products/images/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${randomPage}`);
    console.log('API response images:', res.data);
    return res.data;
  };

  // generate dummy image suggestion
  const generateDummyImage = async () => {
    try {
      setIsGenerating(true);
      const query = getSearchQuery();
      console.log('Generating image for query:', query);
      if (!query) throw new Error('Please provide category.');
      let images = imageBatch;
      if (images.length === 0) {
        images = await fetchNewBatch(query);
      }

      let selected;
      let attempts = 0;
      const max = images.length;
      // fallback dummy image if only one image is available
      if (images.length === 1) {
        selected = images[0];
      } else {
        do {
          selected = images[Math.floor(Math.random() * images.length)];
          attempts++;
        } while (selected?.url === tempDummyImage?.url && attempts < max);
      }

      // default to a placeholder if no valid image is selected
      if (!selected || !selected.url) {
        throw new Error('Failed to select a unique image.');
      }

      setImageBatch(images.filter(i => i.url !== selected.url));
      setTempDummyImage(selected);
      console.log('tempDummyImage:', selected);
    } catch (e) {
      setGenerationError(e.message);
      setTempDummyImage({ url: `https://placehold.co/800x1000?text=${encodeURIComponent(e.message)}` });
    } finally {
      setIsGenerating(false);
    }
  };

  // track file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setSelectedFile({
        file,
        preview_url: previewUrl,
        alt_text: file.name
      });
      setTempDummyImage(null);
    }
  };

    // add generated image to product
  const handleAddDummyImage = () => {
    if (replaceTargetUrl || productImages.length >= 3) return;

    if (selectedFile?.file && selectedFile?.preview_url) {
      const newImage = {
        url: selectedFile.preview_url,
        preview_url: selectedFile.preview_url,
        alt_text: selectedFile.file.name,
        rawFile: selectedFile.file
      };
      onImagesUpdate([...productImages, newImage]);
      setSelectedFile(null);
      return;
    }

    if (tempDummyImage?.url) {
      onImagesUpdate([...productImages, tempDummyImage]);
      setTempDummyImage(null);
    }
  };


  // begin image replacement
  const handleReplaceImage = (targetUrl) => {
    setReplaceTargetUrl(targetUrl);
    setTempDummyImage(null);
    setSelectedFile(null);
  };

  // apply selected or generated replacement image
  const applyReplacement = () => {
    if (!replaceTargetUrl) return;

    const updated = productImages.map(img => {
      if (img.url === replaceTargetUrl || img.preview_url === replaceTargetUrl) {
        // Replace with local file
        if (selectedFile?.file && selectedFile.preview_url) {
          return {
            ...img,
            url: selectedFile.preview_url,
            preview_url: selectedFile.preview_url,
            rawFile: selectedFile.file,
            alt_text: selectedFile.alt_text || selectedFile.file.name
          };
        }

        // Replace with API image
        if (tempDummyImage?.url) {
          return {
            ...img,
            url: tempDummyImage.url,
            preview_url: null,
            alt_text: tempDummyImage.alt_text
          };
        }
      }

      return img;
    });

    onImagesUpdate(updated);
    setReplaceTargetUrl(null);
    setSelectedFile(null);
    setTempDummyImage(null);
  };

  // mark selected image as the main one
  const handleSetMainImage = (image) => {
    const updated = productImages.map(img => ({
      ...img,
      is_main: img.url === image.url
    }));
    onImagesUpdate(updated);
  };

  // delete image from list
  const handleDeleteImage = (url) => {
    onImagesUpdate(productImages.filter(img => img.url !== url));
    if (replaceTargetUrl === url) setReplaceTargetUrl(null);
  };

  const ImagePreview = ({ file, image, label }) => {
    const url = file?.preview_url || image?.preview_url || image?.url;
    const alt = file?.alt_text || file?.name || image?.alt_text || 'Preview';
    if (!url) return null;

    return (
      <div className="mt-4">
        <p className="font-bold">{label}</p>
        <img src={url} alt={alt} className="w-48 h-auto border rounded" />
      </div>
    );
  };

  return (
    <div>
      {/* Image list */}
      <div className="flex gap-4 flex-wrap">
        {productImages.map((img, i) => {
          const isMain = img.is_main;
          return (
            <div key={i} className="flex flex-col items-center relative border p-2 rounded shadow-sm">
              <img
                src={img.preview_url || img.url}
                alt={img.alt_text || ''}
                className="w-32 h-40 object-cover rounded"
              />

              {/* Main label */}
              {isMain && (
                <span className="absolute top-1 left-1 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                  MAIN
                </span>
              )}

              {/* Image actions */}
              <div className="flex flex-col mt-2 gap-1">
                {!isMain && (
                  <button type="button" onClick={() => handleSetMainImage(img)} className="text-xs text-gray-700 hover:underline">
                    Set as Main
                  </button>
                )}
                <button type="button" onClick={() => handleDeleteImage(img.url)} className="text-xs text-red-600 hover:underline">
                  Delete
                </button>
                <button type="button" onClick={() => handleReplaceImage(img.url)} className="text-xs text-blue-600 hover:underline">
                  Replace
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add image controls */}
      {productImages.length < 3 && !replaceTargetUrl && (
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={generateDummyImage} disabled={isGenerating} className="w-fit">
            {isGenerating ? 'Generating...' : 'Generate Image'}
          </button>
          <input type="file" onChange={handleFileSelect} />
          <button
            type="button"
            onClick={handleAddDummyImage}
            disabled={!tempDummyImage && !selectedFile}
            className="w-fit"
          >
            Add Image
          </button>
        </div>
      )}

      {/* Replacement mode */}
      {replaceTargetUrl && (
        <div className="mt-6 border p-4 rounded bg-gray-50">
          <p className="font-semibold mb-2">Replacing selected image</p>
          <input type="file" onChange={handleFileSelect} />
          <button type="button" onClick={generateDummyImage} className="mt-2">Generate Replacement</button>
          <button
            type="button"
            onClick={applyReplacement}
            disabled={!selectedFile && !tempDummyImage}
            className="mt-1"
          >
            Apply
          </button>
          <button type="button" onClick={() => setReplaceTargetUrl(null)}>Cancel</button>
          <ImagePreview
            file={selectedFile}
            image={tempDummyImage}
            label="Replacement Preview"
          />
        </div>
      )}

      {/* preview if not in replacement mode */}
      {(tempDummyImage || selectedFile) && !replaceTargetUrl && productImages.length < 3 && (
        <ImagePreview
          file={selectedFile?.file}
          image={tempDummyImage}
          label="Preview"
        />
      )}

      {/* Error messages */}
      {generationError && <p className="text-red-600 mt-2">{generationError}</p>}
      {uploadError && <p className="text-red-600 mt-2">{uploadError}</p>}
    </div>
  );
};

export default ImageUploader;
