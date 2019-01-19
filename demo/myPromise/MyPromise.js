const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';


class MyPromise {
    
    constructor(fn) {
        if (!fn || typeof fn !== 'function') throw new Error('My promise must input a fn');
        this.resolve = this.resolve.bind(this);
        this.reject = this.reject.bind(this);
        this.state = PENDING;
        this.value = undefined;
        this.reason = undefined;
        this.onFulfilled = null;
        this.onRejected = null;
        try{
           fn(this.resolve,this.reject);
        }catch(e) {
           console.log(e);
        }
    }
    then(onFulfilled,onRejected) {
        console.log(onFulfilled);
        this.onFulfilled = onFulfilled;
        this.onRejected = onRejected;
        if (this.state === PENDING) return;
        if (this.state === FULFILLED) {
            
        }
        if (this.state === REJECTED) {

        }
    }
    resolve(value) {
        console.log(value)
        console.log("resolve1");
        if (this.state !== PENDING) return;
        this.value = value;
        console.log("resolve2");
        this.state = FULFILLED;
        let x;
        let that = this;
        setTimeout(function(){
            console.log("onFulfilled",that.onFulfilled);
            try{
                if (that.onFulfilled) {
                    x = that.onFulfilled(this.value);
                    return new MyPromise(function(resolve,reject) {
                        resolve(x);
                    });
                };
            } catch(e) {
                return new MyPromise(function(resolve,reject) {
                    reject(e)
                });
            }
        },0);
    }
    reject(reason) {
        if (this.state !== PENDING) return;
        this.reason = reason
        this.state = REJECTED;
    }
}


new MyPromise(function(resolve,reject) {
    setTimeout(function() {
        resolve("aaa")
    },5)
    console.log("111");
}).then(function(value) {
    console.log("222");
    console.log(value);
})