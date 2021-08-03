# Runtime Type Checker

> a runtime type checker of any object for javascript.

![NPM](https://img.shields.io/npm/l/runtime-type-checker)
![npm](https://img.shields.io/npm/dw/runtime-type-checker)

## Installation

```bash
$ npm i runtime-type-checker
```

## import

```javascript
import TypeChecker from "runtime-type-checker";//es6
const TypeChecker = require("runtime-type-checker");//
```

- unpkg

```html
<!-- latest version -->
<script src="https://unpkg.com/runtime-type-checker/lib/bundle.js"></script>
```

# Usage

```javascript
// init a checker
const allTypeChecker = {
    //[any key]: TypeChecker[type you want][add isRequire if it Required]
    array: TypeChecker.array.isRequired,
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
// your data
const exampleData = {
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

// final, call check fun
//TypeChecker.checkPropTypes(Checker, value, [displayName for usage place], [objctName]);
const result = TypeChecker.checkPropTypes(allTypeChecker, value, 'test', 'test2');
// and result is null because of all prototype has passed the checker
// if some prototype don't, the result will be an array of error message
```
