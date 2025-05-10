const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');
const walletService = require('./wallet-service');

class FabricService {
    constructor() {
        this.connectionConfigs = {};
        this.loadConnectionConfigs();
    }

    loadConnectionConfigs() {
        const configPath = path.join(__dirname, '../config/connection-config.json');
        const configJSON = fs.readFileSync(configPath, 'utf8');
        this.connectionConfigs = JSON.parse(configJSON);
    }

    async connect(orgName, userId) {
        try {
            const orgConfig = this.connectionConfigs[orgName];
            if (!orgConfig) {
                throw new Error(`Organization ${orgName} configuration not found`);
            }

            const gateway = new Gateway();
            const wallet = await walletService.getWallet();
            const identity = await wallet.get(userId);

            if (!identity) {
                throw new Error(`Identity for user ${userId} not found in wallet`);
            }

            await gateway.connect(orgConfig.connectionProfile, {
                wallet,
                identity: userId,
                discovery: { enabled: true, asLocalhost: true }
            });

            const network = await gateway.getNetwork(process.env.CHANNEL_NAME);
            const contract = network.getContract(process.env.CHAINCODE_NAME);

            return contract;
        } catch (error) {
            throw new Error(`Failed to connect to Fabric network: ${error}`);
        }
    }

    async getCAClient(orgName) {
        try {
            const orgConfig = this.connectionConfigs[orgName];
            if (!orgConfig) {
                throw new Error(`Organization ${orgName} configuration not found`);
            }

            const caInfo = orgConfig.connectionProfile.certificateAuthorities[orgConfig.caName];
            const caTLSCACerts = caInfo.tlsCACerts.pem;
            const ca = new FabricCAServices(caInfo.url, {
                trustedRoots: caTLSCACerts,
                verify: false
            }, caInfo.caName);

            return ca;
        } catch (error) {
            throw new Error(`Failed to create CA client: ${error}`);
        }
    }

    disconnect() {
        if (this.gateway) {
            this.gateway.disconnect();
        }
    }
}

module.exports = new FabricService();