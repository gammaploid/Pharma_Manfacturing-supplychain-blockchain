const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

class FabricService {
    constructor() {
        this.gateway = new Gateway();
        this.connectionProfile = JSON.parse(fs.readFileSync(
            path.resolve(__dirname, '../config/connection-config.json'), 'utf8'
        ));
    }

    async connect(org, userId) {
        try {
            const walletPath = path.join(process.cwd(), 'wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            const identity = await wallet.get(userId);
            if (!identity) {
                throw new Error(`Identity ${userId} not found in wallet`);
            }

            const connectionOptions = {
                identity: userId,
                wallet: wallet,
                discovery: { enabled: true, asLocalhost: true }
            };

            await this.gateway.connect(this.connectionProfile, connectionOptions);
            const network = await this.gateway.getNetwork('pharmachannel');
            const contract = network.getContract('pharma');

            return contract;
        } catch (error) {
            throw new Error(`Failed to connect to Fabric network: ${error}`);
        }
    }

    async disconnect() {
        this.gateway.disconnect();
    }
}

module.exports = new FabricService();