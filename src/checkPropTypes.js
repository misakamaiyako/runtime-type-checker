import secret from "./secret";

/**
 * Assert that the values match with the type specs.
 * Error messages are memorized and will only be shown once.
 *
 * @param {Object} typeSpecs - Map of name to a ReactPropType;
 * @param {Object} values - Runtime values that need to be type-checked;
 * @param {string} location - e.g. "prop", "context", "child context";
 * @param {string} objectName - Name of the object for error messages.
 * @return {null|Error[]} - If all passed, got null, or an array of messages
 * @private
 */
function checkPropTypes(typeSpecs, values, location, objectName) {
    const result = []
    for (const typeSpecName in typeSpecs) {
        if (typeSpecs.hasOwnProperty(typeSpecName)) {
            var error;
            // Prop type validation may throw. In case they do, we don't want to
            // fail the render phase where it didn't fail before. So we log it.
            // After these have been cleaned up, we'll let them throw.
            try {
                // This is intentionally an invariant that gets caught. It's the same
                // behavior as without this statement except with a better message.
                if (typeof typeSpecs[typeSpecName] !== 'function') {
                    const err = Error(
                        (objectName || 'Object') + ': ' + location + ' type `' + typeSpecName + '` is invalid; ' +
                        'it must be a function, usually from the `type-checker` package, but received `' + typeof typeSpecs[typeSpecName] + '`.' +
                        'This often happens because of typos such as `TypeChecker.function` instead of `TypeChecker.func`.'
                    );
                    err.name = 'Invariant Violation';
                    throw err;
                }
                error = typeSpecs[typeSpecName](values, typeSpecName, objectName, location, null, secret);
            } catch (ex) {
                error = ex;
            }
            if (error && !(error instanceof Error)) {
                throw new Error((objectName || 'Object') + ': type specification of ' +
                    location + ' `' + typeSpecName + '` is invalid; the type checker ' +
                    'function must return `null` or an `Error` but returned a ' + typeof error + '. ' +
                    'You may have forgotten to pass an argument to the type checker ' +
                    'creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and ' +
                    'shape all require an argument).')
            } else if (error) {
                result.push(error)
            }
        }
    }
    if (result.length === 0) {
        return null
    } else {
        return result
    }
}

export default checkPropTypes
