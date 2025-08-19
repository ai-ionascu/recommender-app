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

## Microservices — Order Service

Microserviciul **Order Service** gestioneaza coșurile de cumpărături, comenzile și plățile, cu stocare în **MongoDB**, procesare plăți prin **Stripe** și integrare prin **RabbitMQ** cu celelalte microservicii.

Versiunea actuala include:

- **Cart management**
  - Adaugare, actualizare, stergere produse in cos
  - Snapshot de preturi si validare stoc/pret in timp real prin product-service

- **Checkout & Orders**
  - Creare comanda din cos cu validare suplimentara stoc/pret
  - Persistenta in Mongo cu schema clara: `Order`, `Cart`, `Payment`, `ProcessedEvent`
  - Suport pentru paginare, sortare si filtrare comenzi

- **Stripe Payments**
  - Endpoint `/orders/:id/pay` → creaza PaymentIntent (test mode)
  - Webhook `/payments/webhook` → actualizeaza `Payment` + marcheaza `Order` ca `paid`
  - Idempotenta:
    - `Idempotency-Key` pe client sau generat din `(orderId, amount, currency)`
    - Deduplicare webhook cu tabela `processed_events`

- **RabbitMQ integration**
  - Publisher: emite `order.paid` cu detalii comanda catre exchange-ul `events`
  - Consumer (product-service): scade stocurile din Postgres

- **Endpointuri de baza**
  - `/cart` → gestionare cos
  - `/checkout` → plasare comanda
  - `/orders` → listare, vizualizare comenzi user
  - `/orders/:id/pay` → creare intent de plata Stripe
  - `/payments/webhook` → procesare webhook Stripe

- **Altele**
  - Health-check (`/health`, `/ready`)
  - Centralizare erori cu `AppError`
  - Logare structurata ([Cart], [Checkout], [Stripe], [Rabbit])

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

## Microservices — Search (Elasticsearch & Kibana)

Integrarea **Elasticsearch** oferă funcționalități avansate de căutare full-text, autocomplete și filtrare prin **facets**.  
**Kibana** este inclus pentru debugging și analiză, disponibil pe portul `5601`.

### Versiunea actuală include:

- **Indexare automată**
  - La creare/actualizare produs în `product-service`, documentul este indexat în Elasticsearch
  - La ștergere produs, documentul este eliminat și din index

- **Mapping & Analyzers**
  - `text_ro_en` cu stopwords (RO+EN), stemming, synonyms, asciifolding
  - `autocomplete` bazat pe `edge_ngram` pentru sugestii rapide
  - Suport pentru căutare tolerantă la diacritice și fuzzy matching

- **Facets & Boosting**
  - Facets pe `country`, `grape`, `price` (intervale dinamice)
  - Boost pentru produse `featured`, recență (`sales_30d`) și recenzii pozitive

- **Kibana**
  - Interfață web la [http://localhost:5601](http://localhost:5601) pentru interogări, analiză date și debugging

---

## Structura proiectului

```text
wine_store/
├── common/
│   ├── schemas/
│   └── utils/
├── frontend/
│   ├── Dockerfile
│   └── src/...
├── infra/
│   └── init/
│       ├── 00-create-databases-and-roles.sql
│       ├── 01-init-products.sql
│       ├── 02-init-users.sql
│       └── 03-init-analytics.sql
├── product-service/
│   ├── es-bootstrap.sh                 # bootstrap ES + backfill la startup
│   ├── scripts/
│   │   └── es/
│   │       ├── initProductsIndex.js    # creează index/alias
│   │       ├── backfillProductsToEs.js # reindexare din Postgres
│   │       └── products.mapping.json   # mapping + analyzers
│   ├── src/
│   │    └── search/
│   │        ├── esClient.js
│   │        ├── search.controller.js
│   │        └── search.routes.js
│   └── ...
├── order-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── models/ (Cart, Order, Payment, ProcessedEvent)
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── config/
│   └── ...
├── auth-service/
│   ├── Dockerfile
│   └── src/...
├── docker-compose.yml
├── README.md
└── ...
```
---

## Setup & Pornire

### Product Service

1. **Defineste variabilele** in fisierul `.env`:

   ```dotenv
    # server
    PORT=3000
    NODE_ENV=production

    # database
    PG_HOST=postgres
    PG_PORT=5432
    PG_USER=products_admin
    PG_PASSWORD=admin
    PG_DB=products_db
    DATABASE_URL=postgres://products_admin:admin@postgres:5432/products_db

    # Cloudinary
    CLOUDINARY_CLOUD_NAME=...
    CLOUDINARY_API_KEY=594434818152253
    CLOUDINARY_API_SECRET=...
    CLOUDINARY_UPLOAD_URL=https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload
    CLOUDINARY_UPLOAD_PRESET=products_unsigned

    # Image APIs
    PEXELS_API_KEY=...
    UNSPLASH_ACCESS_KEY=...

    # rabbitMQ
    RABBITMQ_URL=amqp://appuser:appsecret@rabbitmq:5672
    RABBITMQ_EXCHANGE=events
    RABBITMQ_STOCK_QUEUE=product.stock.adjust

    # Elasticsearch
    ES_URL=http://elasticsearch:9200
    ES_ALIAS=products
   ```
2. **Servicii noi in docker-compose.yml:**

  ```text
  rabbitmq:
    image: rabbitmq:3-management
    container_name: rabbitmq
    hostname: rabbitmq-broker
    env_file: .env
    environment:
      RABBITMQ_DEFAULT_USER: appuser
      RABBITMQ_DEFAULT_PASS: appsecret
    ports:
      - "5672:5672" # AMQP protocol
      - "15672:15672" # Management UI
    networks:
      - wine-store-network
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "status"]
      interval: 10s
      timeout: 5s
      retries: 5
  ```
3. **Servicii in docker-compose.override.yml:**

  ```text
    services:
    elasticsearch:
      image: docker.elastic.co/elasticsearch/elasticsearch:8.14.1
      container_name: elasticsearch
      environment:
        - discovery.type=single-node
        - xpack.security.enabled=false
        - ES_JAVA_OPTS=-Xms1g -Xmx1g
      ports:
        - "9200:9200"
      volumes:
        - esdata:/usr/share/elasticsearch/data
      healthcheck:
        test: ["CMD-SHELL", "curl -sf http://localhost:9200 >/dev/null"]
        interval: 10s
        timeout: 5s
        retries: 30
      networks:
        - wine-store-network

    kibana:
      image: docker.elastic.co/kibana/kibana:8.14.1
      container_name: kibana
      environment:
        - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      ports:
        - "5601:5601"
      depends_on:
        elasticsearch:
          condition: service_healthy
      networks:
        - wine-store-network

  volumes:
    esdata:

  networks:
    wine-store-network:
  ```

3. **Scripturi init DB** (`infra/init/00…04-*.sql`) sunt deja montate in `docker-compose.yml` — vor crea bazele, rolele, schema, grant-urile si vor popula seed-ul la **prima initializare**.

3. **Porneste** totul cu:

   ```bash
   docker compose up -d
   ```

   - **Volumul** `postgres_data` mentine date intre restarturi. Seed-urile `/docker-entrypoint-initdb.d/*` se ruleaza **o singura data** la initializare.
   - Verifica sanatatea serviciilor:
     ```bash
     docker compose ps
     ```
  - **Pornire bootstrap Elasticsearch**
    ```bash
    - es-bootstrap.sh → verifică conexiunile la Postgres și ES
    - rulează initProductsIndex.js și backfillProductsToEs.js dacă indexul e gol
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

### API Endpoints principale — Order Service

| Metoda | Path              | Descriere |
| ------ | ----------------- | --------- |
| GET    | `/cart`           | Vizualizare cos curent |
| POST   | `/cart`           | Adauga produs in cos |
| PUT    | `/cart/:itemId`   | Actualizeaza cantitatea unui produs din cos |
| DELETE | `/cart/:itemId`   | Sterge produs din cos |
| POST   | `/checkout`       | Creare comanda din cos |
| GET    | `/orders`         | Listare comenzi user logat |
| GET    | `/orders/:id`     | Vizualizare detalii comanda |
| POST   | `/orders/:id/pay` | Creare Stripe PaymentIntent |
| POST   | `/payments/webhook` | Webhook Stripe pentru confirmarea platii |
| GET    | `/health`         | Health check |
| GET    | `/ready`          | Readiness check |

### API Endpoints principale — Elasticsearch

| Metoda | Path                            | Descriere                                |
| ------ | ------------------------------- | ---------------------------------------- |
| GET    | `/search?q=text&size=5`         | Căutare full-text cu facets și highlight |
| GET    | `/search/autocomplete?q=prefix` | Sugestii rapide bazate pe edge-ngram     |

---

## Exemple cURL - Product Service

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

## Exemple cURL - Auth Service

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

## Exemple cURL - Order Service

**Adaugare produs in cos**

```bash
curl -X POST http://localhost:3002/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{
    "productId": "66c9ab...e3a",
    "quantity": 2
  }'
```

**Checkout**

```bash
curl -X POST http://localhost:3002/checkout \
  -H "Authorization: Bearer <JWT>"
```
**Creare intent de plata Stripe**

```bash
curl -X POST http://localhost:3002/orders/<orderId>/pay \
  -H "Authorization: Bearer <JWT>"
```
**Webhook Stripe (simulare din local)**

```bash
curl -X POST http://localhost:3002/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_webhook",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123",
        "metadata": { "orderId": "66ca0...f7" }
      }
    }
  }'
```
**Verificare coada RabbitMQ**

```bash
docker exec -it rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged
```

### Exemple cURL - Search

**Health Check**

```bash
curl -s http://localhost:3000/health
```

**Cautare full-text cu highlight**

```bash
curl -s "http://localhost:3000/search?q=cabernet&size=5" | jq
```

**Cautare autocomplete**

```bash
curl -s "http://localhost:3000/search/autocomplete?q=cab" | jq
```

**Test diacritice**

```bash
curl -s "http://localhost:3000/search?q=rose&size=5" | jq '.total'
curl -s "http://localhost:3000/search?q=ros%C3%A9&size=5" | jq '.total'
```

**Reindexare** - development only

```bash
curl -X DELETE http://localhost:9200/products-v1
npm run es:init
npm run es:backfill
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

**Frontend**
  - integrare cos, checkout si order tracking
  - vizualizare istoricul comenzilor

**Recommender System**
  - content-based filtering initial
  - optional: collaborative filtering/hibrid pentru scor academic mai mare

**Search Service**
  - integrare Elasticsearch pentru cautare full-text si autocomplete

**Documentation**
  - introducere Swagger/OpenAPI pentru documentarea tuturor serviciilor

**Analytics**
- serviciu separat pentru rapoarte si KPI

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