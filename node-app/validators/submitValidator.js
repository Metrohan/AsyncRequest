const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv();
addFormats(ajv);

const schema = {
    type: 'object',
    properties: {
        data: { type: 'string' },
    },
    required: ['data'],
    additionalProperties: false
};

const validate = ajv.compile(schema);

module.exports = function validatePayload(payload) {
    const valid = validate(payload);
    return { valid, errors: validate.errors };
};
