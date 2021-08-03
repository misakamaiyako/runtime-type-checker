export default (() => {
    if (typeof Symbol == "function") {
        return Symbol.for("type-checker-secret")
    } else {
        return "type-checker-secret"
    }
})()
