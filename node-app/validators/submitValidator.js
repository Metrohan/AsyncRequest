const Ajv = require('ajv');
const ajv = new Ajv();

const schema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        // payload alanlarını buraya tanımla
    },
    required: ['name', 'email'],
    additionalProperties: false
};

const validate = ajv.compile(schema);

module.exports = function validatePayload(payload) {
    const valid = validate(payload);
    return { valid, errors: validate.errors };
};
