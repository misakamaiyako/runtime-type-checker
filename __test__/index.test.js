import TypeChecker from '..'

describe('tests', function () {
    it('should return an array of Error', function () {
        const checkers = {
            name: TypeChecker.string,
            age: TypeChecker.number,
        };

        const values = {
            name: 'hello',
            age: 'world',
        };
        const result = TypeChecker.checkPropTypes(checkers, values, 'test', 'test1');
        expect(result).toBeInstanceOf(Array)
        expect(result.every(it => it instanceof Error)).toBeTruthy()
    });
    const allTypeChecker = {
        array: TypeChecker.array,
        bool: TypeChecker.bool,
        func: TypeChecker.func,
        number: TypeChecker.number,
        object: TypeChecker.object,
        string: TypeChecker.string,
        symbol: TypeChecker.symbol,
        any: TypeChecker.any,
        arrayOf: TypeChecker.arrayOf(TypeChecker.string),
        instanceOf: TypeChecker.instanceOf(Date),
        objectOf: TypeChecker.objectOf(TypeChecker.string),
        oneOf: TypeChecker.oneOf(['a', 'b']),
        oneOfType: TypeChecker.oneOfType([TypeChecker.string, TypeChecker.number]),
        shape: TypeChecker.shape({key: TypeChecker.string, value: TypeChecker.number}),
        exact: TypeChecker.exact({key: TypeChecker.string, value: TypeChecker.number}),
    }
    it('should return null when all passed', function () {
        const value = {
            array: [],
            bool: false,
            func: () => void 0,
            number: 123,
            object: {},
            string: "TypeChecker('string')",
            symbol: Symbol("lucky"),
            any: 123n,
            arrayOf: ["string"],
            instanceOf: new Date(),
            objectOf: {"213": "DD"},
            oneOf: "a",
            oneOfType: "string",
            shape: {key: "123"},
            exact: {key: "123", value: 123},
        }
        const result = TypeChecker.checkPropTypes(allTypeChecker, value, 'test', 'test2');
        expect(result).toBe(null)
    });
    it('should return null when value is empty', function () {
        const result = TypeChecker.checkPropTypes(allTypeChecker, {}, 'test', 'test3');
        expect(result).toBe(null)
    });
    it('should get an error when key is required', function () {
        const require = {
            number: TypeChecker.number.isRequired
        }
        expect(TypeChecker.checkPropTypes(require, {}, "test", "test4")[0]).toBeInstanceOf(Error)
        expect(TypeChecker.checkPropTypes(require, {number: 1}, "test", "test5")).toBeNull()
    });
});
