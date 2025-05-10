# Pharmaceutical Manufacturing Supply Chain using Hyperledger Fabric

A blockchain-based solution for tracking and verifying pharmaceutical manfacturing processes across the supply chain using the permissioned Hyperledger Fabric, privaetly among stakeholder parties.

### Motivation

The pharmaceutical supply chain is a critical component of healthcare systems, and ensuring its transparency and efficiency is paramount. Recent research highlights the challenges faced in this domain. For example:

- [Smith et al., 2024](https://www.sciencedirect.com/science/article/abs/pii/S1551741124000792) discuss the vulnerabilities in global pharmaceutical supply chains and emphasise the necessity of blockchain-based solutions to enhance transparency and traceability.

This project addresses such challenges by leveraging **HyperLedger** to create a robust blockchain solution for the pharmaceutical supply chain.

---


## System Architecture

The system consists of four main components:

1. **Hyperledger Fabric Network**
   - Multiple organizations (Manufacturer, Distributor, Pharmacy, Regulator)
   - Channel-based privacy
   - Chaincode for drug batch lifecycle management

2. **Smart Contracts (Chaincode)**
   - Written in Go
   - Manages drug batch creation, transfers, and verification
   - Role-based access control

3. **API Server**
   - Node.js with Express
   - Fabric SDK integration
   - JWT-based authentication
   - RESTful endpoints for all operations

4. **Web Frontend** (Coming Soon)
   - React-based dashboard
   - Role-specific views
   - Real-time tracking
   - QR/Barcode scanning capability

## Prerequisites

- Go 1.19+
- Node.js 14.14.0+
- Docker and Docker Compose
- Hyperledger Fabric 2.5+

## Project Structure

```
├── api-server/          # Node.js API server
├── chaincode/           # Go chaincode
├── front-end/          # React frontend (WIP)
└── network/            # Fabric network configuration
```

## Setup Instructions

1. **Network Setup**
   ```bash
   cd network
   ./scripts/startNetwork.sh
   ```

2. **Install Chaincode**
   ```bash
   cd chaincode/pharma
   go mod vendor
   cd ../../network
   ./scripts/deployChaincode.sh
   ```

3. **Start API Server**
   ```bash
   cd api-server
   npm install
   npm start
   ```

## API Endpoints

### Drug Batch Operations

- POST `/api/v1/organization/:org/batch` - Create new drug batch
- PUT `/api/v1/organization/:org/batch/transfer` - Transfer drug batch
- GET `/api/v1/organization/:org/batch/:id` - Get drug batch details
- GET `/api/v1/organization/:org/batches` - List all drug batches

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
