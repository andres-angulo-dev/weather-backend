const checkBody = (body, keys) => {
    let isValid = true;

    for (let field of keys) {
        if (!body[field] || body[field] == '') {
            isValid = false;
        }
    }
    return isValid;
}

module.exports = { checkBody };