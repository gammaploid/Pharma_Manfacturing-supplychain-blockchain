const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

class WalletService {
    constructor() {
        this.walletPath = path.join(process.cwd(), 'wallet');
        if (!fs.existsSync(this.walletPath)) {
            fs.mkdirSync(this.walletPath);
        }
    }

    async getWallet() {
        return await Wallets.newFileSystemWallet(this.walletPath);
    }

    async enrollAdmin(orgName, caClient) {
        try {
            const wallet = await this.getWallet();
            const adminIdentity = await wallet.get('admin');

            if (adminIdentity) {
                console.log('Admin identity already exists in the wallet');
                return;
            }

            const enrollment = await caClient.enroll({
                enrollmentID: 'admin',
                enrollmentSecret: 'adminpw'
            });

            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: `${orgName}MSP`,
                type: 'X.509',
            };

            await wallet.put('admin', x509Identity);
            console.log('Successfully enrolled admin user and imported it into the wallet');
            return x509Identity;
        } catch (error) {
            throw new Error(`Failed to enroll admin user: ${error}`);
        }
    }

    async registerAndEnrollUser(orgName, userId, role, caClient) {
        try {
            const wallet = await this.getWallet();
            const userIdentity = await wallet.get(userId);

            if (userIdentity) {
                throw new Error(`Identity for user ${userId} already exists in the wallet`);
            }

            // Check if admin exists
            const adminIdentity = await wallet.get('admin');
            if (!adminIdentity) {
                throw new Error('Admin identity is not found in the wallet');
            }

            // Get admin for registering new users
            const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
            const adminUser = await provider.getUserContext(adminIdentity, 'admin');

            // Register user
            const secret = await caClient.register({
                enrollmentID: userId,
                role: role,
                affiliation: `${orgName.toLowerCase()}.department1`
            }, adminUser);

            // Enroll user
            const enrollment = await caClient.enroll({
                enrollmentID: userId,
                enrollmentSecret: secret
            });

            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: `${orgName}MSP`,
                type: 'X.509',
            };

            await wallet.put(userId, x509Identity);
            console.log(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
            return x509Identity;
        } catch (error) {
            throw new Error(`Failed to register user: ${error}`);
        }
    }

    async getUserIdentity(userId) {
        try {
            const wallet = await this.getWallet();
            const identity = await wallet.get(userId);
            if (!identity) {
                throw new Error(`Identity for user ${userId} does not exist in the wallet`);
            }
            return identity;
        } catch (error) {
            throw new Error(`Failed to get user identity: ${error}`);
        }
    }

    async getAllUsers() {
        try {
            const wallet = await this.getWallet();
            const identities = await wallet.list();
            return identities;
        } catch (error) {
            throw new Error(`Failed to get user list: ${error}`);
        }
    }

    async removeUser(userId) {
        try {
            const wallet = await this.getWallet();
            await wallet.remove(userId);
            return true;
        } catch (error) {
            throw new Error(`Failed to remove user: ${error}`);
        }
    }
}

module.exports = new WalletService();