const jwt = require('jsonwebtoken');
const { Wallets } = require('fabric-network');
const path = require('path');

async function authMiddleware(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user exists in wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const identity = await wallet.get(decoded.userId);
        
        if (!identity) {
            throw new Error('User identity not found in wallet');
        }

        // Verify organization matches the requested organization
        const { organization } = req.params;
        if (organization && organization !== decoded.organization) {
            throw new Error('Organization mismatch');
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'Authentication failed' 
        });
    }
}