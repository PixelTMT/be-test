# Node Wave Base Repositories for Backend


## Tech Stacks 

- Language : TypeScript 
- ORM : Prisma 
- Database : MySQL
- HTTP Framework : Express 
- Logging : Winston + Morgan

> [!NOTE]  
>  As stated in Getting Started parts of our notion, don't forget to make sure that you have Node.js >= 16.14.2 and MySQL >= 8.0.3

## How to use

This project is for **NodeWave Back End Candidate Assessment** with JWT authentication, background job processing, and comprehensive API endpoints.

### 📚 API Documentation

The complete API documentation is available in **`[API_DOCUMENTATION.md](API_DOCUMENTATION.md)`**. This file contains:

- **Authentication Endpoints** - User registration, login, profile management
- **File Processing Endpoints** - Upload, status checking, data retrieval, retry/delete functionality
- **Request/Response Examples** - Complete JSON examples for all endpoints
- **Error Handling** - Standardized error response formats
- **Security Features** - JWT authentication, file validation, user isolation

### 🧪 Testing with Postman

For easier testing, a [Postman collection](Example_Files/Postman_NodeWave_Backend-Rich_Evan_lee.postman_collection.json) is provided.


This collection includes pre-configured requests for:
- User authentication (register, login, profile)
- File upload and processing
- Status checking and data retrieval
- File retry and delete operations

**To use the Postman collection:**
1. Import the JSON file into Postman
2. Set up environment variables:
   - `baseUrl`: `http://localhost:3150`
   - `authToken`: (will be set automatically after login)
3. Start with the login request to get your authentication token
4. Use the authenticated requests for file operations

### 📋 Quick Start Workflow

1. **Register/Login** - Create account or login to get JWT token
2. **Upload Excel File** - Upload .xlsx or .xls files (max 10MB)
3. **Check Status** - Monitor processing progress
4. **Retrieve Data** - View extracted cell data with pagination
5. **Retry/Delete** - Handle failed files or remove processed files

## Steps To Run Project Locally

```
git checkout develop
```
Install dependencies with :

```powershell
npm install
```

Get .env value, and change db connection url in .env

Run prisma db migration with :

```powershell
npx prisma migrate --name <migration_name>
```
Run seeder for admin user :

  > [!IMPORTANT]  
  > Delete this part on your repository in case there is no seeder available on your codebase.

```powershell
npm run seed
```

## Running The App 

This base app was meant to have several different implementation, for now we just have a REST API Server, but if we happen to 
have more like grpc, cron, or maybe pub-sub consumer, we can register it too the 
`/app` and `/server` folder 

and register the command into the `/src/index.ts` as the argument of choice 

By Default, to run the app with hot-reload simply run 
```
npm run dev -- --service=rest
```

If you want to start the build version, run it with : 
```
npm start -- --service=rest
```

## Creating new features / endpoint

- Branch out from develop
```
git checkout -b <branch_name>
```
- Create a new schema (if needed) on prisma/schema.prisma

- Migrate the schema with :
```
npx prisma migrate --name <migration_name>
```

- Create new entity on `/entities` folder

- Create validation for that entities (for create and update if any) on `/validations` folder

- Create the service layer on /services

- Link it into controller in /controllers

- Create new routes file instance at /routes, for example `ProductRoutes.ts`

- Register the routes into registry (`routes/registry.ts`)

- use the routes, with router.use(), for example :

  ```js
  router.use("/products", RoutesRegistry.productRoutes);
  ```

- Test in postman and document it with example


## Folder Structures Brief Explanation 

#### Apps and Servers 

- `/app` 

  This contains app inilization for different communication protocol, files inside this directory is responsible to starting up the communcation protocol based server

  Default app is rest, if you want to add more , you can add it by naming it something like `<protocol>.ts` , e.g. : `grpc.ts` , add it to instance.ts 

- `/server` 
  
  This contains server initialization for different communication 
  protocol server, file inside this directory will responsible to hold the configuration needed, like the the server initialization, dependencies for this communcation protocol etc. 

  if you want to add more , you can add it by naming it something like `<protocol>.ts` , e.g. : `grpc.ts` , add it to the instance.ts 

> [!IMPORTANT]  
> After you add both app and server, configure it to be receivable my the command line argument, by adding the app function and argument into the if condition inside `src/index.ts`

#### Entities 

- `/entity` 

  Files inside this directory, will hold various `interfaces` or `types`, needed for data transfer and access (DTOs and DAOs), in this directory, we follow the Domain-Driven pattern, where it will easily transalates to each domain means each table on db. 

  Or maybe in other case, you can also specify global types that is used everywhere in the code, like `Service.ts` that we currently have and `Query.ts` entities, this means to hold all types related to service responses and dynamic query arguments and also pagination result.


#### Packages and Utils

- `/pkg` 

  This dir is simple, you categorize 3rd party integration inside of this dir, you can also define types spesific to this 3rd party inside here, so the common practice is something like : 
  ```
    - pkg 
        - package name 
            - index.ts -> package instance (use singleton if possible please)
            - interfaces.ts -> for package spesific typing 
            - utils.ts  -> for utility functions
            - ... methodspecific.ts -> for specific sub-functionality, e.g: coreAPI.ts in midtrans pkg only holds functions needed to do payment through midtrans's Core API
  ```

  We make it in this structure so it will be clear that all of this belongs to specific 3rd party.

- `/utils` 

  This dir will holds utility function that are needed for helpers globally, like string manipulation, dates manipulation etc 

 
#### Controllers and Services 

 - `/controllers` 
  Here, we also follow domain based filenaming, so each domain will have 1 controller, with the responsibility in controller, only limited to 
    - Retrieve and parse the request.
    - Call service function 
    - Return the response.


 - `/services`

  Here, we also follow domain based file naming, each domain will have 1 services, and maybe 1 helper service if needed, with the responsibility in service is only to do business logics, calling the db (we don't use repository since prisma orm is already more or less like a repository in it's nature). Please never mix up 3rd party integration here, as we already have the package for that, unless the 3rd party will also have controllers (like midtrans callback).


#### Routes, Validations and Middlewares

- `/routes` 

  This folders mainly has 3 parts 
  1. Domain based files ( e.g. : `ProductRoutes.ts` ), will contains all of the routings by domain 
  2. `RoutesRegistry.ts`, we pool all the routes exports here 
  3. index.ts -> we attach all the routes, pooled from `RoutesRegistry.ts` here

- `/validations` 

  Domain based, serve as a middleware, contains validation for any operation that involves sending request body, normally you will create the validation here,
  and use it on routes as a `middleware`.
 
  > [!WARNING]  
  > Don't use validation function inside controllers because it will cause an error if you do so.


- `/middlewares` 

  Here contains middlewares that can be used in the `/server/` directory or that can be used globally inside many routes, for example we have 
  `authMiddleware` for JWT authentication, `morganMiddleware` for http logging.
