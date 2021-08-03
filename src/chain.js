import mySecret from './secret'

export default function createChainableTypeChecker(validate) {
    function checkType(isRequired, props, propName, componentName, location, propFullName, secret) {
        componentName = componentName || "<<anonymous>>";
        propFullName = propFullName || propName;

        if (secret !== mySecret) {
            var err = new Error(
                'Calling TypeChecker validators directly is not supported by the `type-checker` package. ' +
                'Use `TypeChecker.checkPropTypes()` to call them. '
            );
            err.name = 'Invariant Violation';
            throw err;
        }
        if (props[propName] == null) {
            if (isRequired) {
                if (props[propName] === null) {
                    return new TypeError('The ' + location + ' `' + propFullName + '` is marked as required ' + ('in `' + componentName + '`, but its value is `null`.'));
                }
                return new TypeError('The ' + location + ' `' + propFullName + '` is marked as required in ' + ('`' + componentName + '`, but its value is `undefined`.'));
            }
            return null;
        } else {
            return validate(props, propName, componentName, location, propFullName);
        }
    }

    var chainedCheckType = checkType.bind(null, false);
    chainedCheckType.isRequired = checkType.bind(null, true);

    return chainedCheckType;
}
