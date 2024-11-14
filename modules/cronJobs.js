const cron = require('node-cron');
const User = require('../models/users');

const cleanUnconfirmAccounts = async () =>  {
    const now = new Date();
    const cutoff = new Date((now - 2 * 60 * 1000) - 30000)

    console.log('NOW:', now); 
    console.log('CUTOFF:', cutoff);

    try {
        const result = await User.deleteMany({ 
            verifiedEmail: false,
            createdAt: { $lt: cutoff },
        });

        if (result.deletedCount > 0) {
            console.log(`Deleted ${result.deletedCount} unconfirmed accounts`);
        } else {
            console.log('No unconfirmed accounts found to delete')
        }
    } catch (error) {
        console.error('Failed to clean unconfirmed accounts: ', error);
    }
};

cron.schedule('0 0 * * *', () => {
    console.log('Running daily cleanup of unconfirmed accounts');
    cleanUnconfirmAccounts();
});