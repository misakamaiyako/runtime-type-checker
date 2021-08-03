(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.TypeChecker = factory());
}(this, (function () { 'use strict';

    var TypeCheckerSecret = (() => {
        if (typeof Symbol == "function") {
            return Symbol.for("type-checker-secret")
        } else {
            return "type-checker-secret"
        }
    })();

    function createChainableTypeChecker(validate) {
        function checkType(isRequired, props, propName, componentName, location, propFullName, secret) {
            componentName = componentName || "<<anonymous>>";
            propFullName = propFullName || propName;

            if (secret !== TypeCheckerSecret) {
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
        const result = [];
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
                    error = typeSpecs[typeSpecName](values, typeSpecName, objectName, location, null, TypeCheckerSecret);
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
                    result.push(error);
                }
            }
        }
        if (result.length === 0) {
            return null
        } else {
            return result
        }
    }

    /**
     * We use an Error-like object for backward compatibility as people may call
     * PropTypes directly and inspect their output. However, we don't use real
     * Errors anymore. We don't inspect their stack anyway, and creating them
     * is prohibitively expensive if they are created too often, such as what
     * happens in oneOfType() for any type before the one that matched.
     */
    function PropTypeError(message, data) {
        this.message = message;
        this.data = data && typeof data === 'object' ? data : {};
        this.stack = '';
    }

    // Make `instanceof Error` still work for returned errors.
    PropTypeError.prototype = Error.prototype;

    const has = Function.call.bind(Object.prototype.hasOwnProperty);

    function emptyFunctionThatReturnsNull() {
        return null;
    }

    function Prototype () {

        var ANONYMOUS = '<<anonymous>>';

        var TypeChecker = {
            array: createPrimitiveTypeChecker('array'),
            bool: createPrimitiveTypeChecker('boolean'),
            func: createPrimitiveTypeChecker('function'),
            number: createPrimitiveTypeChecker('number'),
            object: createPrimitiveTypeChecker('object'),
            string: createPrimitiveTypeChecker('string'),
            symbol: createPrimitiveTypeChecker('symbol'),

            any: createAnyTypeChecker(),
            arrayOf: createArrayOfTypeChecker,
            instanceOf: createInstanceTypeChecker,
            objectOf: createObjectOfTypeChecker,
            oneOf: createEnumTypeChecker,
            oneOfType: createUnionTypeChecker,
            shape: createShapeTypeChecker,
            exact: createStrictShapeTypeChecker,
        };

        /**
         * inlined Object.is polyfill to avoid requiring consumers ship their own
         * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
         */

        /*eslint-disable no-self-compare*/
        function is(x, y) {
            // SameValue algorithm
            if (x === y) {
                // Steps 1-5, 7-10
                // Steps 6.b-6.e: +0 != -0
                return x !== 0 || 1 / x === 1 / y;
            } else {
                // Step 6.a: NaN == NaN
                return x !== x && y !== y;
            }
        }

        function createPrimitiveTypeChecker(expectedType) {
            function validate(props, propName, componentName, location, propFullName) {
                const propValue = props[propName];
                const propType = getPropType(propValue);
                if (propType !== expectedType) {
                    // `propValue` being instance of, say, date/regexp, pass the 'object'
                    // check, but we can offer a more precise error message here rather than
                    // 'of type `object`'.
                    const preciseType = getPreciseType(propValue);

                    return new PropTypeError(
                        'Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + preciseType + '` supplied to `' + componentName + '`, expected ') + ('`' + expectedType + '`.'),
                        {expectedType: expectedType}
                    );
                }
                return null;
            }

            return createChainableTypeChecker(validate);
        }

        function createAnyTypeChecker() {
            return createChainableTypeChecker(emptyFunctionThatReturnsNull);
        }

        function createArrayOfTypeChecker(typeChecker) {
            function validate(props, propName, componentName, location, propFullName) {
                if (typeof typeChecker !== 'function') {
                    return new PropTypeError('Property `' + propFullName + '` of component `' + componentName + '` has invalid PropType notation inside arrayOf.');
                }
                const propValue = props[propName];
                if (!Array.isArray(propValue)) {
                    const propType = getPropType(propValue);
                    return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected an array.'));
                }
                for (let i = 0; i < propValue.length; i++) {
                    const error = typeChecker(propValue, i, componentName, location, propFullName + '[' + i + ']', TypeCheckerSecret);
                    if (error instanceof Error) {
                        return error;
                    }
                }
                return null;
            }

            return createChainableTypeChecker(validate);
        }

        function createInstanceTypeChecker(expectedClass) {
            function validate(props, propName, componentName, location, propFullName) {
                if (!(props[propName] instanceof expectedClass)) {
                    const expectedClassName = expectedClass.name || ANONYMOUS;
                    const actualClassName = getClassName(props[propName]);
                    return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + actualClassName + '` supplied to `' + componentName + '`, expected ') + ('instance of `' + expectedClassName + '`.'));
                }
                return null;
            }

            return createChainableTypeChecker(validate);
        }

        function createEnumTypeChecker(expectedValues) {
            if (!Array.isArray(expectedValues)) {
                if (arguments.length > 1) {
                    console.warn(
                        'Invalid arguments supplied to oneOf, expected an array, got ' + arguments.length + ' arguments. ' +
                        'A common mistake is to write oneOf(x, y, z) instead of oneOf([x, y, z]).');
                } else {
                    console.warn('Invalid argument supplied to oneOf, expected an array.');
                }
                return emptyFunctionThatReturnsNull;
            }

            function validate(props, propName, componentName, location, propFullName) {
                const propValue = props[propName];
                for (let i = 0; i < expectedValues.length; i++) {
                    if (is(propValue, expectedValues[i])) {
                        return null;
                    }
                }

                const valuesString = JSON.stringify(expectedValues, function replacer(key, value) {
                    const type = getPreciseType(value);
                    if (type === 'symbol') {
                        return String(value);
                    }
                    return value;
                });
                return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of value `' + String(propValue) + '` ' + ('supplied to `' + componentName + '`, expected one of ' + valuesString + '.'));
            }

            return createChainableTypeChecker(validate);
        }

        function createObjectOfTypeChecker(typeChecker) {
            function validate(props, propName, componentName, location, propFullName) {
                if (typeof typeChecker !== 'function') {
                    return new PropTypeError('Property `' + propFullName + '` of component `' + componentName + '` has invalid PropType notation inside objectOf.');
                }
                const propValue = props[propName];
                const propType = getPropType(propValue);
                if (propType !== 'object') {
                    return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected an object.'));
                }
                for (const key in propValue) {
                    if (has(propValue, key)) {
                        const error = typeChecker(propValue, key, componentName, location, propFullName + '.' + key, TypeCheckerSecret);
                        if (error instanceof Error) {
                            return error;
                        }
                    }
                }
                return null;
            }

            return createChainableTypeChecker(validate);
        }

        function createUnionTypeChecker(arrayOfTypeCheckers) {
            if (!Array.isArray(arrayOfTypeCheckers)) {
                console.warn('Invalid argument supplied to oneOfType, expected an instance of array.');
                return emptyFunctionThatReturnsNull;
            }

            for (let i = 0; i < arrayOfTypeCheckers.length; i++) {
                const checker = arrayOfTypeCheckers[i];
                if (typeof checker !== 'function') {
                    console.warn(
                        'Invalid argument supplied to oneOfType. Expected an array of check functions, but ' +
                        'received ' + getPostfixForTypeWarning(checker) + ' at index ' + i + '.'
                    );
                    return emptyFunctionThatReturnsNull;
                }
            }

            function validate(props, propName, componentName, location, propFullName) {
                const expectedTypes = [];
                for (let i = 0; i < arrayOfTypeCheckers.length; i++) {
                    const checker = arrayOfTypeCheckers[i];
                    const checkerResult = checker(props, propName, componentName, location, propFullName, TypeCheckerSecret);
                    if (checkerResult == null) {
                        return null;
                    }
                    if (checkerResult.data.hasOwnProperty('expectedType')) {
                        expectedTypes.push(checkerResult.data.expectedType);
                    }
                }
                const expectedTypesMessage = (expectedTypes.length > 0) ? ', expected one of type [' + expectedTypes.join(', ') + ']' : '';
                return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` supplied to ' + ('`' + componentName + '`' + expectedTypesMessage + '.'));
            }

            return createChainableTypeChecker(validate);
        }

        function invalidValidatorError(componentName, location, propFullName, key, type) {
            return new PropTypeError(
                (componentName || 'Object') + ': ' + location + ' type `' + propFullName + '.' + key + '` is invalid; ' +
                'it must be a function, usually from the `prop-types` package, but received `' + type + '`.'
            );
        }

        function createShapeTypeChecker(shapeTypes) {
            function validate(props, propName, componentName, location, propFullName) {
                const propValue = props[propName];
                const propType = getPropType(propValue);
                if (propType !== 'object') {
                    return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type `' + propType + '` ' + ('supplied to `' + componentName + '`, expected `object`.'));
                }
                for (const key in shapeTypes) {
                    const checker = shapeTypes[key];
                    if (typeof checker !== 'function') {
                        return invalidValidatorError(componentName, location, propFullName, key, getPreciseType(checker));
                    }
                    const error = checker(propValue, key, componentName, location, propFullName + '.' + key, TypeCheckerSecret);
                    if (error) {
                        return error;
                    }
                }
                return null;
            }

            return createChainableTypeChecker(validate);
        }

        function createStrictShapeTypeChecker(shapeTypes) {
            function validate(props, propName, componentName, location, propFullName) {
                const propValue = props[propName];
                const propType = getPropType(propValue);
                if (propType !== 'object') {
                    return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type `' + propType + '` ' + ('supplied to `' + componentName + '`, expected `object`.'));
                }
                // We need to check all keys in case some are required but missing from
                // props.
                const allKeys = Object.assign(Object.create(null), props[propName], shapeTypes);
                for (const key in allKeys) {
                    const checker = shapeTypes[key];
                    if (has(shapeTypes, key) && typeof checker !== 'function') {
                        return invalidValidatorError(componentName, location, propFullName, key, getPreciseType(checker));
                    }
                    if (!checker) {
                        return new PropTypeError(
                            'Invalid ' + location + ' `' + propFullName + '` key `' + key + '` supplied to `' + componentName + '`.' +
                            '\nBad object: ' + JSON.stringify(props[propName], null, '  ') +
                            '\nValid keys: ' + JSON.stringify(Object.keys(shapeTypes), null, '  ')
                        );
                    }
                    const error = checker(propValue, key, componentName, location, propFullName + '.' + key, TypeCheckerSecret);
                    if (error) {
                        return error;
                    }
                }
                return null;
            }

            return createChainableTypeChecker(validate);
        }

        function isSymbol(propType, propValue) {
            // Native Symbol.
            if (propType === 'symbol') {
                return true;
            }

            // falsy value can't be a Symbol
            if (!propValue) {
                return false;
            }

            // 19.4.3.5 Symbol.prototype[@@toStringTag] === 'Symbol'
            if (propValue['@@toStringTag'] === 'Symbol') {
                return true;
            }

            // Fallback for non-spec compliant Symbols which are polyfilled.
            return typeof Symbol === 'function' && propValue instanceof Symbol;


        }

        // Equivalent of `typeof` but with special handling for array and regexp.
        function getPropType(propValue) {
            const propType = typeof propValue;
            if (Array.isArray(propValue)) {
                return 'array';
            }
            if (propValue instanceof RegExp) {
                // Old webkits (at least until Android 4.0) return 'function' rather than
                // 'object' for typeof a RegExp. We'll normalize this here so that /bla/
                // passes PropTypes.object.
                return 'object';
            }
            if (isSymbol(propType, propValue)) {
                return 'symbol';
            }
            return propType;
        }

        // This handles more types than `getPropType`. Only used for error messages.
        // See `createPrimitiveTypeChecker`.
        function getPreciseType(propValue) {
            if (typeof propValue === 'undefined' || propValue === null) {
                return '' + propValue;
            }
            const propType = getPropType(propValue);
            if (propType === 'object') {
                if (propValue instanceof Date) {
                    return 'date';
                } else if (propValue instanceof RegExp) {
                    return 'regexp';
                }
            }
            return propType;
        }

        // Returns a string that is postfixed to a warning about an invalid type.
        // For example, "undefined" or "of type array"
        function getPostfixForTypeWarning(value) {
            const type = getPreciseType(value);
            switch (type) {
                case 'array':
                case 'object':
                    return 'an ' + type;
                case 'boolean':
                case 'date':
                case 'regexp':
                    return 'a ' + type;
                default:
                    return type;
            }
        }

        // Returns class name of the object, if any.
        function getClassName(propValue) {
            if (!propValue.constructor || !propValue.constructor.name) {
                return ANONYMOUS;
            }
            return propValue.constructor.name;
        }

        TypeChecker.checkPropTypes = checkPropTypes;
        TypeChecker.PropTypes = TypeChecker;

        return TypeChecker;
    }

    /*
     * MIT License
     *
     * Copyright (c) 2021-present, @MisakaMaiyako, Personal.
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in all
     * copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
     */

    var index = Prototype();

    return index;

})));
