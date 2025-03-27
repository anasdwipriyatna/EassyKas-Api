# Eassykas App - Backend REST API

## Overview

This document outlines the backend REST API for the Eassykas app, which is built using Express.js. The app is designed to manage the financial records (kas) of a class in a school effectively.

## Prerequisites

Ensure that you have the following installed on your machine:

- Node.js
- npm (Node Package Manager)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/eassykas.git
   ```
2. Navigate to the project directory:
   ```bash
   cd eassykas
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```

## Running the Server

Start the Express.js server with the following command:

```bash
npm start
```

The server will run on `http://localhost:3000`.

## API Endpoints

### 1. Get All Transactions

- **Endpoint**: `/api/transactions`
- **Method**: GET
- **Description**: Retrieve a list of all financial transactions for the class.
- **Response**: JSON array of transaction objects.

### 2. Add a New Transaction

- **Endpoint**: `/api/transactions`
- **Method**: POST
- **Description**: Add a new transaction to the class records.
- **Request Body**: JSON object containing transaction details (e.g., amount, date, description).
- **Response**: JSON object of the created transaction.

### 3. Update a Transaction

- **Endpoint**: `/api/transactions/:id`
- **Method**: PUT
- **Description**: Update details of an existing transaction.
- **Request Body**: JSON object with updated transaction details.
- **Response**: JSON object of the updated transaction.

### 4. Delete a Transaction

- **Endpoint**: `/api/transactions/:id`
- **Method**: DELETE
- **Description**: Remove a transaction from the records.
- **Response**: Confirmation message of deletion.

## Contributing

Contributions to the Eassykas app are welcome. Please fork the repository and submit a pull request with your changes.

## License

This project is licensed under the MIT License.
