# Online Shop with Recommender System

## Microservices — Product Service

Acesta este microserviciul **Product Service** din cadrul aplicatiei. Gestioneaza CRUD pentru produse, imagini, caracteristici (features) si recenzii (reviews), in stil MVC si containerizat cu Docker.

Versiunea actuala include:

- Un backend REST complet functional pentru gestiunea produselor, cu:
  - operatii CRUD complete cu validare pe baackend
  - validare avansata si generare automata de `slug` unic
  - cautare imagini prin APIs Unsplash si Pexels
  - incarcare imagini cu Cloudinary, selectie `is_main` pentru imagini, validari stricte
 

## Microservices — Frontend

Versiunea actuala include un framework basic pentru dashboard Admin si este in curs de extindere:

- Listare produse, creare, editare, stergere
  - Formular dinamic create/edit cu câmpuri specifice categoriei
  - Upload imagini cu preview, înlocuire, stergere, alegere imagine principala
  - Resetare completa a starii formularului si inputurilor dupa submit sau cancel

## Microservices — Auth Service

Microserviciul **Auth Service** gestioneaza autentificarea, autorizarea si managementul utilizatorilor, cu suport pentru verificarea emailului si resetarea parolei.  
Serviciul ruleaza pe Node.js (ESM), Express si PostgreSQL, cu JWT pentru autentificare si Gmail OAuth2 pentru trimitere de mailuri.

Versiunea actuala include:

- **Autentificare si autorizare**
  - Signup cu email si parola, rol implicit `user`
  - Login cu JWT + role-based access control (`requireRole`)
  - Middleware `requireAuth` pentru protejarea endpoint-urilor
  - Logout (stergere token pe client)

- **Verificare email**
  - Generare token unic si stocare în `email_verification_tokens`
  - Trimitere link de verificare pe email (Gmail OAuth2)
  - Endpoint `/auth/verify` pentru validarea tokenului si marcarea utilizatorului ca `is_verified`
  - Cleanup automat al tokenurilor expirate si stergere useri neverificati dupa 1h

- **Resetare parola**
  - Solicitare resetare (token în `password_reset_tokens`, valabil 1h)
  - Link de resetare trimis pe email
  - Resetare parola DOAR pentru utilizatori autentificati si cu verificarea parolei curente

- **Schimbare email**
  - Solicitare schimbare (token în `email_change_tokens`, valabil 1h)
  - Confirmare schimbare email prin link trimis pe noua adresa
  - Validare si actualizare email în DB

- **Securitate**
  - Parole hash-uite cu bcrypt
  - Rate limiting si verificare reCAPTCHA (Google) pe rute sensibile
  - JWT configurabil (secret si expirare în `.env`)

- **Joburi automate**
  - Cronjob pentru curatare tokenuri expirate (email verification, password reset, email change)
  - stergere automata useri neverificati dupa 1h

---

## Structura proiectului

```text
wine_store/
|   |
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
```

---

## Setup & Pornire

### Product Service

1. **Defineste variabilele** in fisierul `.env` (in radacina):

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

2. **Scripturi init DB** (`infra/init/00…04-*.sql`) sunt deja montate in `docker-compose.yml` — vor crea bazele, rolele, schema, grant-urile si vor popula seed-ul la **prima initializare**.

3. **Porneste** totul cu:

   ```bash
   docker compose up -d
   ```

   - **Volumul** `postgres_data` mentine date intre restarturi. Seed-urile `/docker-entrypoint-initdb.d/*` se ruleaza **o singura data** la initializare.
   - Verifica sanatatea serviciilor:
     ```bash
     docker compose ps
     ```

4. **Migratii** (daca adaugi altele) se ruleaza automat la startup prin `runMigration()` in `app.js`.

### Auth Service

1. **Defineste variabilele** in fisierul `.env` (in radacina):

```dotenv
   # DB
PG_USER=users_admin
PG_PASSWORD=admin
PG_HOST=localhost
PG_PORT=5432
USERS_DB=users_db

# JWT
JWT_SECRET=my_jwt_secret
JWT_EXPIRES_IN=6h

# Email Verification Tokens
EMAIL_TOKEN_SECRET=my_email_token_secret
EMAIL_TOKEN_EXPIRES_IN=15m

# Gmail OAuth2
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_SENDER_ADDRESS=...
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground

# bcrypt
BCRYPT_SALT_ROUNDS=10

# reCAPTCHA
RECAPTCHA_SECRET_KEY=...
   ```

2. **Ruleaza cu Docker**:

```bash
docker compose up -d auth-service
```

3. **Testare rapida** cu scriptul *test-auth-service.ps1* sau *test-auth-service.sh* din radacina.:

---

## API Endpoints - Product Service

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


## API Endpoints principale — Auth Service

| Metoda | Path                          | Descriere |
| ------ | ----------------------------- | --------- |
| POST   | `/auth/signup`                | Înregistrare utilizator + email verification |
| POST   | `/auth/login`                  | Login cu JWT |
| GET    | `/auth/profile`                | Obtine profilul utilizatorului autentificat |
| GET    | `/auth/admin/panel`            | Endpoint protejat pentru admin |
| GET    | `/auth/verify`                 | Verificare email din link |
| POST   | `/auth/request-password-reset` | Solicita resetare parola (link pe email) |
| POST   | `/auth/reset-password`         | Reseteaza parola (token din email + parola curenta) |
| PUT    | `/auth/change-password`        | Schimba parola pentru user logat |
| PUT    | `/auth/change-email`           | Solicita schimbarea emailului (link pe noul email) |
| GET    | `/auth/confirm-email-change`   | Confirma noul email din link |
| POST   | `/auth/logout`                 | Logout utilizator |
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

### Exemplu cURL: Signup

```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "pass123"}'
```

### Exemplu cURL: Login

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "pass123"}'
```

---

## Seed-uri & Date reale

### Product Service

- Seed-urile SQL din `infra/init/00..04-*.sql` vor popula automat DB la **prima pornire**. Vezi `04-seed-products-features-reviews.sql` pentru un set initial de 20 produse + features + reviews.
- Seed-urile se pot rula si manual astfel:
  ```bash
  docker compose exec postgres \
    psql -U $PG_USER -d $PG_DB -f /docker-entrypoint-initdb.d/04-seed-products-features-reviews.sql
  ```

### Auth Service

- Migratiile ruleaza automat la pornire (runMigration() în app.js)

- Seed-ul pentru utilizatori default (admin@example.com, user@example.com) ruleaza tot la pornire

---

## Next Steps

**auth-service** – finisaje și îmbunatatiri:
   - Adaugare audit log minimal (login, schimbare parola, schimbare email)
   - Documentatie Swagger pentru API
   - Rate limiting pe endpoint-uri sensibile (signup/login/reset-password)

**order Service** – dezvoltare următorul microserviciu:
- Model și API pentru gestionarea comenzilor
  - Creare comandă nouă din coșul de cumpărături
  - Actualizare status comandă (ex: pending, paid, shipped, delivered)
  - Listare comenzi pentru userul logat și pentru admin
- Integrare cu **auth-service** pentru identificarea și autorizarea utilizatorilor
- Gestionare stocuri la plasarea și anularea comenzilor
- Integrare stub de plată (Stripe sau alt provider în modul test)
- Salvarea istoricului comenzilor pentru rapoarte și recomandări
- Endpoint-uri pentru administratori (gestionare comenzi, schimbare status, refund-uri)
- Pregătire pentru integrarea viitoare cu message broker (RabbitMQ) pentru notificări și actualizări în timp real

## Functionalitati planificate

- Sistem de recomandare (suggestii personalizate bazate pe comportament) - filtrare colaborativa, hibrid
- Serviciu de cautare cu Elasticsearch (full-text, filtre, autocomplete)
- Serviciu de analytics & raportare (metrici de vanzari, comportament utilizator)
- Notificari in timp real (email, WebSocket)
- Interfata Admin Dashboard (vizualizare KPI, management utilizatori si comenzi etc.)
- Finalizare frontend UI

## Functionalitati planificate (optional - nice to have)

- Pipeline CI/CD & teste automate (unit, integration)
- Monitorizare si logare centralizata (Prometheus, Grafana, ELK)
- Documentatie OpenAPI: src/docs/openapi.yaml → Swagger UI.
- Teste automate: Jest/Supertest.