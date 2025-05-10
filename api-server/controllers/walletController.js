const walletService = require('../services/wallet-service');
const fabricService = require('../services/fabric-service');

class WalletController {
    async enrollAdmin(req, res) {
        try {
            const { organization } = req.params;
            const caClient = await fabricService.getCAClient(organization);
            const identity = await walletService.enrollAdmin(organization, caClient);
            
            res.json({
                success: true,
                message: 'Admin enrolled successfully',
                identity: identity
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Failed to enroll admin: ${error.message}`
            });
        }
    }

    async registerUser(req, res) {
        try {
            const { organization } = req.params;
            const { userId, role } = req.body;

            const caClient = await fabricService.getCAClient(organization);
            const identity = await walletService.registerAndEnrollUser(
                organization,
                userId,
                role,
                caClient
            );

            res.json({
                success: true,
                message: `User ${userId} registered successfully`,
                identity: identity
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Failed to register user: ${error.message}`
            });
        }
    }

    async getUserIdentity(req, res) {
        try {
            const { userId } = req.params;
            const identity = await walletService.getUserIdentity(userId);
            
            res.json({
                success: true,
                identity: identity
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: `Failed to get user identity: ${error.message}`
            });
        }
    }

    async getAllUsers(req, res) {
        try {
            const users = await walletService.getAllUsers();
            
            res.json({
                success: true,
                users: users
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Failed to get users: ${error.message}`
            });
        }
    }

    async removeUser(req, res) {
        try {
            const { userId } = req.params;
            await walletService.removeUser(userId);
            
            res.json({
                success: true,
                message: `User ${userId} removed successfully`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `Failed to remove user: ${error.message}`
            });
        }
    }
}

module.exports = new WalletController();