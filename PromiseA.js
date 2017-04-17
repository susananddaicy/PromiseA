(function () {
    function PromiseA(fn) {
        const self = this;
        self.data = undefined;
        self.status = self.STATUS.PENDING;
        self.onResolvedCallback = [];
        self.onRejectedCallback = [];

        function resolve(value) {
            if (value instanceof PromiseA) {
                value.then(resolve, reject);
            } else {
                setTimeout(function () {
                    self.status = self.STATUS.RESOLVED;
                    self.data = value;
                    self.onResolvedCallback.forEach(function (callback) {
                        callback(value);
                    });
                }, 0);
            }
        }

        function reject(reason) {
            if (value instanceof PromiseA) {
                value.then(resolve, reject);
            } else {
                setTimeout(function () {
                    self.status = self.STATUS.REJECTED;
                    self.data = reason;
                    self.onRejectedCallback.forEach(function (callback) {
                        callback(reason);
                    });
                }, 0);
            }
        }
        try {
            fn(resolve, reject);
        } catch (e) {
            reject(e);
        }

    }

    function resolvePromise(promise2, x, resolve, reject) {
        if (promise2 === x) {
            return reject(new TypeError('Chaining cycle detected for promise!'));
        }
        if (x instanceof PromiseA) {
            return x.then(resolve, reject);
        }
        //对接第三方promise库，只需要判断x中是否存在then，如果存在，则继续执行
        if (x != null && ((x instanceof Object) || (x instanceof Function))) {
            if (x.then instanceof Function) {
                try {
                    x.then.call(x, function (rs) {
                        resolvePromise(promise2, rs, resolve, reject);
                    }, function (rj) {
                        resolvePromise(promise2, rj, resolve, reject);
                    });
                } catch (e) {
                    reject(e);
                }

            } else {
                resolve(x);
            }
        } else {
            resolve(x);
        }
    }

    // then是一个monad, then 后面需要反馈一个新的promise
    PromiseA.prototype.then = function (onResolved, onRejected) {

        let promise2 = null;
        let self = this;
        // onResolved，onRejected为空时，需要把值传递到后面的promise中
        onResolved = onResolved instanceof Function ? onResolved : function (value) {
            return value;
        };
        onRejected = onRejected instanceof Function ? onRejected : function (reason) {
            return reason;
        };

        // 当状态为pending时，先把执行方法push到队列中
        if (self.status === self.STATUS.PENDING) {
            promise2 = new PromiseA(function (resolve, reject) {
                self.onResolvedCallback.push(function (value) {
                    setTimeout(function () {
                        try {
                            const ret = onResolved(self.data);
                            resolvePromise(promise2, ret, resolve, reject);
                        } catch (e) {
                            reject(e);
                        }
                    }, 0);
                });
                self.onRejectedCallback.push(function (reason) {
                    setTimeout(function () {
                        try {
                            const ret = onRejected(self.data);
                            resolvePromise(promise2, ret, resolve, reject);
                        } catch (e) {
                            reject(e);
                        }
                    }, 0);
                });
            })
        }
        // 当状态为resolve时，直接执行。如果值为Promise，则需要继续传递
        if (self.status === self.STATUS.RESOLVED) {
            promise2 = new PromiseA(function (resolve, reject) {
                setTimeout(function () {
                    try {
                        const ret = onResolved(self.data);
                        resolvePromise(promise2, ret, resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                }, 0);
            });
        }
        // reject 处理，同上
        if (self.status === self.STATUS.REJECTED) {
            setTimeout(function () {
                try {
                    const ret = onRejected(self.data);
                    resolvePromise(promise2, ret, resolve, reject);
                } catch (e) {
                    reject(e);
                }
            }, 0);
        }
        return promise2;
    }

    PromiseA.prototype.catch = function (onRejected) {
        this.then(null, onRejected);
    }
    PromiseA.prototype.done = function () {
        this.catch(function (e) {
            console.log(e);
        });
    }

    PromiseA.all = function (promises) {
        return new PromiseA(function (resolve, reject) {
            let resolvedCount = 0;
            let resolvedValue = new Array(promises.length);
            if (!(promises instanceof Array)) {
                return reject(new Error('Promise should be a array'));
            }
            promises.forEach(function (promise, index) {
                PromiseA.resolve(promise).then(function (value) {
                    resolvedCount++;
                    resolvedValue[index] = value;
                    if (resolvedCount === promises.length) {
                        resolve(resolvedValue);
                    }
                }, function (reason) {
                    reject(reason);
                });
            });

        })
    }

    PromiseA.race = function (promises) {
        return new PromiseA(function (resolve, reject) {
            if (!(promises instanceof Array)) {
                return reject(new Error('Promise should be a array'));
            }
            promises.forEach(function (promise) {
                PromiseA.resolve(promise).then(function (value) {
                    resolve(value);
                }, function (reason) {
                    reject(reason);
                })
            });
        });
    }

    PromiseA.resolve = function (value) {
        return new PromiseA(function (resolve, reject) {
            resolve(value);
        });
    }
    PromiseA.reject = function (reason) {
        return new PromiseA(function (resolve, reject) {
            resolve(value);
        })
    }

    PromiseA.prototype.STATUS = {
        PENDING: 1,
        RESOLVED: 2,
        REJECTED: 3,
    };
    module.exports = PromiseA;
    return PromiseA;
})();