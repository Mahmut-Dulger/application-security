# Courses: back-end

## Installation

### PostgreSQL

Make sure that you have a local installation of PostgreSQL running and that you have created a user with all privileges. This user will be used in the `.env` file to configure the database connection.

To set a password for the `postgres` user, you can execute:

```sql
ALTER USER postgres WITH PASSWORD 'postgres';
```

### Dotenv

Dotenv is a module to externalize configuration, for instance database connection details.
To get this demo up and running, you'll need to create a **.env** file in you root project directory (on the same level as .gitignore). The contents should look like this:

```properties
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/courses?schema=public"
APP_PORT=3000
JWT_SECRET="d2ViNC1ub3Qtc28tc2VjcmV0LWFjY2Vzcy1zZWNyZXQ="
JWT_EXPIRES_HOURS=8
```

Replace the connection details with the ones from your server.
You can replace the JWT secret with any random, long string.

### VSCode

Recommended extensions:

-   Prettier - Code formatter
-   Auto Rename Tag
-   GitLens - Git supercharged

Open the settings of VSCode, search for **Format on save** and make sure it's checked. This assures that every time you save a file, it's being formatted according to the code style rules described in **.prettier.rc**.

## Starting the application

Run the following commands in a terminal (project root folder) to get the application up and running.

Install all required node dependencies:

```console
$ npm install
```

The first time running this application, you will have to run the database migration scripts. You can do this by executing:

```console
$ npx prisma migrate dev
```

**Note:** You will need to execute this every time the prisma schema is changed.

When making changes to the prisma schema, you will also have to re-generate the prisma client:

```console
$ npx prisma generate
```

Optionally, you can execute the seed script to fill the database with test data:

```console
$ npx ts-node seed.ts
```

To start the Node.js server execute:

```console
$ npm start
```

This will start an express server on <http://localhost:3000>.
You can test if everything works by requesting <http://localhost:3000/status> or <http://localhost:3000/counters> from a browser or a tool like Postman.

You can access the API documentation and test it via Swagger running on <http://localhost:3000/api-docs>.
