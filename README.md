# Online Shop with Recommender System

## Microservices — Product Service

Acesta este microserviciul **Product Service** din cadrul aplicatiei. Gestioneaza CRUD pentru produse, imagini, caracteristici (features) si recenzii (reviews), in stil MVC si containerizat cu Docker.

---

## Structura proiectului

```text
wine_store/
├── .vscode/
│   └── settings.json
├── common/
│   ├── schemas/
│   └── utils/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── api/
│       ├── components/
│       ├── pages/
│       └── ...
├── infra/
│   └── init/
│       ├── 00-create-databases-and-roles.sql
│       ├── 01-init-products.sql
│       ├── 02-init-users.sql
│       └── 03-init-analytics.sql
├── product-service/
│   ├── Dockerfile
│   ├── wait-for-db.sh
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── config/
│       │   ├── env.js
│       │   ├── db.js
│       │   └── cloudinary.js
│       ├── controllers/
│       │   ├── product.controller.js
│       │   ├── image.controller.js
│       │   ├── feature.controller.js
│       │   ├── review.controller.js
│       │   └── media.controller.js
│       ├── db/
│       │   ├── migrations/
│       │   └── run-migrations.js
│       ├── errors/
│       │   ├── AppError.js
│       │   └── errorHandler.js
│       ├── repositories/
│       │   ├── product.repository.js
│       │   ├── subtype.repository.js
│       │   ├── image.repository.js
│       │   ├── feature.repository.js
│       │   └── review.repository.js
│       ├── routes/
│       │   ├── product.routes.js
│       │   ├── image.routes.js
│       │   ├── feature.routes.js
│       │   ├── review.routes.js
│       │   └── media.routes.js
│       ├── services/
│       │   ├── product.service.js
│       │   ├── image.service.js
│       │   ├── feature.service.js
│       │   ├── review.service.js
│       │   └── media.service.js
│       ├── validations/
│       │   ├── product.validation.js
│       │   ├── image.validation.js
│       │   ├── feature.validation.js
│       │   ├── review.validation.js
│       │   └── media.validation.js
│       └── utils/
│           ├── transaction.js
│           ├── catchAsync.js
│           └── slug.js
├── Dockerfile
├── wait-for-db.sh
├── .env
├── .gitignore
├── .dockerignore
├── docker-compose.yml
├── package.json
├── package-lock.json
├── README.md
├── arbore_foldere.txt
├── wine_store.dump
├── feature.json
├── images.json
└── product.json

---

## Setup & Pornire

1. **Clone** repository:

   ```bash
   git clone https://github.com/ai-ionascu/recommender-app.git
   cd recommender-app/online-shop
   ```

2. **Defineste variabilele** in fisierul `.env` (in radacina):

   ```dotenv
   # PostgreSQL
   PG_USER=admin
   PG_PASSWORD=...
   PG_DB=products_db
   PG_PORT=5432
   # RabbitMQ, Mongo, Elasticsearch, etc.
   RABBITMQ_DEFAULT_USER=admin
   RABBITMQ_DEFAULT_PASS=...

   # Cloudinary, Pexels, Unsplash
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   PEXELS_API_KEY=...
   UNSPLASH_ACCESS_KEY=...

   # Port
   PORT=3001
   ```

3. **Scripturi init DB** (`infra/init/00…04-*.sql`) sunt deja montate in `docker-compose.yml` — vor crea bazele, rolele, schema, grant-urile si vor popula seed-ul la **prima initializare**.

4. **Porneste** totul cu:

   ```bash
   docker compose up -d
   ```

   - **Volumul** `postgres_data` mentine date intre restarturi. Seed-urile `/docker-entrypoint-initdb.d/*` se ruleaza **o singura data** la initializare.
   - Verifica sanatatea serviciilor:
     ```bash
     docker compose ps
     ```

5. **Migratii** (daca adaugi altele) se ruleaza automat la startup prin `runMigration()` in `app.js`.

---

## API Endpoints

| Metoda | Path                                | Descriere                             |
| ------ | ----------------------------------- | ------------------------------------- |
| GET    | `/health`                           | Health-check (OK daca serverul e up)  |
| GET    | `/products`                         | Listeaza toate produsele              |
| POST   | `/products`                         | Creaza un produs                      |
| GET    | `/products/:id`                     | Obtine un produs dupa ID              |
| PUT    | `/products/:id`                     | Actualizeaza un produs                |
| DELETE | `/products/:id`                     | sterge un produs                      |
| GET    | `/products/:id/images`              | Listeaza imaginile unui produs        |
| POST   | `/products/:id/images`              | Adauga imagini produsului             |
| PUT    | `/products/:id/images/set-main`     | Seteaza imaginea principala           |
| DELETE | `/products/:id/images/:imageId`     | sterge o imagine                      |
| GET    | `/products/images/search?query={q}` | Cauta imagini (proxy Unsplash/Pexels) |
| GET    | `/products/:id/features`            | Listeaza caracteristici (features)    |
| POST   | `/products/:id/features`            | Adauga o caracteristica               |
| PUT    | `/products/:id/features/:featureId` | Actualizeaza o caracteristica         |
| DELETE | `/products/:id/features/:featureId` | sterge o caracteristica               |
| GET    | `/products/:id/reviews`             | Listeaza recenziile unui produs       |
| POST   | `/products/:id/reviews`             | Adauga o recenzie                     |
| PUT    | `/products/:id/reviews/:reviewId`   | Actualizeaza o recenzie               |
| DELETE | `/products/:id/reviews/:reviewId`   | sterge o recenzie                     |

---

### Exemplu cURL: Creare produs

```bash
curl -i -X POST http://localhost:3001/products \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Vin Nou",
    "price": 19.99,
    "category": "wine",
    "stock": 100,
    "wine_type": "red",
    "grape_variety": "Merlot"
  }'
```

### Exemplu cURL: Adaugare imagine

```bash
curl -i -X POST http://localhost:3001/products/1/images \
  -H 'Content-Type: application/json' \
  -d '{ "images": [
      { "url": "https://...jpg", "is_main": true }
    ]
  }'
```

---

## Seed-uri & Date reale

- Seed-urile SQL din `infra/init/00..04-*.sql` vor popula automat DB la **prima pornire**. Vezi `04-seed-products-features-reviews.sql` pentru un set initial de 20 produse + features + reviews.
- Seed-urile se pot rula si manual astfel:
  ```bash
  docker compose exec postgres \
    psql -U $PG_USER -d $PG_DB -f /docker-entrypoint-initdb.d/04-seed-products-features-reviews.sql
  ```

---

## Next Steps

**Frontend** (React + Vite):
   - Serviciul este existent dar necesita refactorizare pe structura modelului MVC si armonizare cu serviciul product-service.
   - Conectare la noile endpoint-uri dedicate.
   - Componente pentru imagini, features, reviews.

## Functionalitati planificate

- Serviciu de autentificare si autorizare (login, JWT, roluri)
- Serviciu de cos de cumparaturi si plasare comenzi
- Sistem de recomandare (suggestii personalizate bazate pe comportament)
- Serviciu de cautare cu Elasticsearch (full-text, filtre, autocomplete)
- Serviciu de analytics & raportare (metrici de vanzari, comportament utilizator)
- Notificari in timp real (email, WebSocket)
- Interfata Admin Dashboard (vizualizare KPI, management utilizatori si comenzi)

## Functionalitati planificate (optional - nice to have)

- Pipeline CI/CD & teste automate (unit, integration)
- Monitorizare si logare centralizata (Prometheus, Grafana, ELK)
- Documentatie OpenAPI: src/docs/openapi.yaml → Swagger UI.
- Teste automate: Jest/Supertest.