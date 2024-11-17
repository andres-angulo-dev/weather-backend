const User =  require('../models/users');

const checkUnconfirmedUpdates = async (userId) => {
    try {
        const user = await User.findById(userId);
        
        if (user) {
            const now = new Date();
            const cutoff = new Date((now - 15 * 60 * 1000) + 5000) // (15m * 60s * 1000 thousandth of a second) - 5s = 14m55s
            if (user.forgotPasswordRequestInProgress === true && user.tempUpdate.timeStamp <= cutoff) {
                user.forgotPasswordRequestInProgress = false;
                user.tempUpdate.newPassword = null;
                user.tempUpdate.timeStamp = null;
                await user.save();
            }
        }
    } catch (error) {
        console.error('Failed to check unconfirmed updates:', error);
    }
};

module.exports = { checkUnconfirmedUpdates };