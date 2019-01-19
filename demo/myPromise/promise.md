<h1>promise/A+规范</h1>
[promise/A+规范](https://promisesaplus.com/ "promise/A+")</br>
<h2>下面是翻译上面文档的内容</h2>
一个promise代表一个异步操作的最终结果，和一个promise交互的主要方式是通过它的then方法，这个方法注册回调来接收一个promise的最终结果值(value)，或者接收为什么promise不能够完成的原因（reason）。<br/>
## 1.术语 ##
<p>"promise" 是一个对象或函数，并且它拥有一个then方法，这个then方法的行为符合这篇文档所描述的</p>
<p>"thenable" 是一个对象或函数，它只要定义了一个then方法就可以（不一定要符合promise文档）</p>
<p>"value" 是任何合法的js的值(包括undefined，一个thenable，或者一个promise)</p>
<p>"exception"是一个值，这个值是被throw语句抛出的</p>
<p>"reason"是一个值，这个值能够告示为什么一个promise被拒绝了</p>
## 2.promise必备具备 ##
<h3>2.1 Promise状态</h3>
一个Promise必须在这3个状态中的某一个状态：pending，fulfuilled，or rejected
#### 2.1.1  ####
当pending的是时，一个promise：能够转化到fulfilled或者rejected状态
#### 2.1.2 ####
当fullfilled时，不能够转化到任何其他的状态，必须有一个结果的值（value），并且不能够改变
#### 2.1.3 ####
当rejected时，一个promise不能转化到任何其他状态，并且必须有一个结果(reason),并且这个结果不能改变<br/>
注意：这里的不能改变只要===判断返回true，就行，并不是深度相等，比如一个对象，只要始终是这个对象的引用就行，里面的值修改，依然认为它们"没变"。
<h3>2.2 then方法</h3>
一个promise必须提供一个then方法来访问它的当前或者最终value或reason。<br/>
一个promise的then方法接受2个参数:<br/>

    promise.then(onFulfilled,onRejected)

#### 2.2.1 onFulfilled 和 onRejected 都是可选参数: ####
如果onFulfilled不是函数，忽略<br/>
如果onRejected不是函数，忽略<br/>
#### 2.2.2 如果onFulfilled是一个函数####
它必须在promise已经fulfilled的时候调用，并且把promise的value作为它的第一个参数<br/>
它在promise已经fullfilled之前不能够被调用<br/>
它不能调用超过一次<br/>
#### 2.2.3 如果onRejected是一个函数####
它必须在promise已经rejected的时候调用，并且把promsie的reason作为它的第一个参数<br/>
它在promise被拒绝之前不能够被调用
它不能够被调用超过一次
#### 2.2.4 onFulfilled 或者 onRejected直到execution context stack只包含平台代码的时候才能够被调用####
这里平台代码指的是引擎，环境和promise 实现的代码。在实践中，这样的需求确保了onFulfilled 和 onRejected能够异步执行，在eventLoop转到then被调用的地方，当前是一个空的栈吗，这个能够通过macro-task机制比如setTimeout，或者micro-task机制比如mutationObeserver 或者 process.nextTick。由于promise的实现作为平台代码，它包含一个任务调度队列或者
#### 2.2.5 onFulfilled 或者 onRejected必须被作为函数被调用(比如不能够有this value) ####
#### 2.2.6 then 可以被调用多次在同一个promise上面 ####
如果/当 priomise 已经 fulfilled，所有的相关的onFulfilled回调必须按照组织它们的then的这个顺序来调用。也就是按照then的顺序从前往后调用。<br/>
如果/当 promise 已经 rejected，所有的相关的onRejected也应该按照then的顺序执行。
#### 2.2.7 then必须返回一个promise ####

    promise2 = promise1.then（onFulfilled，onRejected）

注：实现允许promise2 === promise1，只要提供的实现满足需求。每一个实现应该用文档标注是否能够promise2 === promise1 并且在何种条件下。<br/>

如果 onFulfilled 或者 onRejected 返回一个value为x，执行Promise Resolution Procedure<br/>
如果 onFulfilled 或者 onRejected 抛出一个异常e，promise2必须被拒绝以e作为reason <br/>
如果 onFulfilled 不是一个函数，并且promise1已经fulfilled，promise2必须fulfilled并且使用promise1相同的value <br/>
如果 onRejected 不是一个函数，并且promise1已经rejected，promise2必须也是rejected并且使用于promise1同样的reason
<h3>2.3 The Promise Resolution Procedure</h3>
The Promise Resolution Procedure是一个抽象的操作，输入一个promise和一个value，记成"[[Resolve]](promise, x)".如果x是一个thenable，它会使promise采用x的状态，至少x能够被认为多少像一个promise。其余情况，用value x 来fulfills promise。<br/>
这种对thenables的对象的对待，可以实现promise来互相操作，只要它们暴露一个then方法。这样就可以跟并不是标准的实现的，但是又合理的then方法进行融合。<br/>
运行"[[Resolve]](promise, x)"，将会执行下列步骤:
## 2.3.1 ##
如果promise和x引用同一个对象，reject promise 用一个TypeError作为reason
## 2.3.2 If x is a promise, adopt its state##
如果x的状态是pending，promise必须保持pending知道x被fulfilled或者rejected<br/>
如果/当 x 的状态是 fullfilled,用相同的value来fulfill promise
如果/当 x 的状态是 rejected,同相同的reason来reject promise
## 2.3.3 除此之外，如通x是一个对象或者函数##
#### 2.3.3.1 ####
让then变成x.then <br/>
#### 2.3.3.2 ####
获得x.then如果是一个被抛出的异常，用e作为reason来reject这个promise
#### 2.3.3.3 如果then是一个函数，把x作为this传入then，并且调用then，第一个参数resolvePromise 第二个参数rejectPromise####
如果/当 resolvePromise 传入一个value y 调用，执行run [[Resolve]](promise, y) <br/>
如果/当 rejectPromise 被传入一个reason r 来调用，用r来reject promise<br/>
如果 resolvePromise和rejectPromise都被调用了，或者多次调用同样的参数，那么第一个调用的优先，后面的忽略掉<br/>
如果调用then抛出一个异常e，如果resolvePromise或者rejectPromise已经被调用了，忽略它,除此之外用e来作为reason来reject这个promise

#### 2.3.3.4 如果then不是一个函数####
用x来fulfill这个promise
## 2.3.4 ##
如果x不是一个对象或者函数，用x的值来fulfill这个promise 
## 3.注意事项 ##