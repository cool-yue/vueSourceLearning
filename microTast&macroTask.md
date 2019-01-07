![](https://i.imgur.com/k5eUIMJ.png)
![](https://i.imgur.com/MfI7N0h.png)
## macro/micro task的机制 ##
**macrotasks**: setTimeout, setInterval, setImmediate, requestAnimationFrame, I/O, UI rendering<br/>
**microtasks**: process.nextTick, Promises, Object.observe, MutationObserver <br/>
先要明确的是浏览器和node都有自己实现的一套宏微任务队列，它们执行的机制按照上面的图中的来,通过一些代码来实践，这里的代码借用了一篇写得不错的文章。
[https://segmentfault.com/a/1190000016022069](https://segmentfault.com/a/1190000016022069)
测试代码借用这位兄台的代码,有2个版本:

    setTimeout(_ => console.log(4))
    
    new Promise(resolve => {
      resolve()
      console.log(1)
    }).then(_ => {
      console.log(3)
      Promise.resolve().then(_ => {
    console.log('before timeout')
      }).then(_ => {
    Promise.resolve().then(_ => {
      console.log('also before timeout')
    })
      })
    })
    console.log(2)

这上面的代码最后运行的结果是:
![](https://i.imgur.com/Ej2ynno.png)

这是简单的纯粹的js代码，下面根据stackoverflow总结的规则来进行分析，在运行js的代码的时候，有个call stack它负责运行同步的js代码，首先按照上面的结论，整个script的加载属于第一次macroTask，它是一个I/O的过程，然后开始执行同步代码，第一次setTimeout（）运行，回调被放入了macroTask队列,console.log(1)输出1,new Promise的resolve回到了microTask，console.log(2)输出2，由于第一次加载<script></script>已经是macroTask了，因此这里找出的macroTask为null，然后开始去microTask去找，发现了console.log（3），于是输出3，然后Promise.resolve()相当于又访问了了microTask,并且往里面追加新的task，这个时候会继续运行console.log('before timeout'),后面又resolve了，相当于又在microTask中加入了taks，那么继续运行，console.log('also before timeout')，再继续找microTask，发现已经空了，然后macroTask，然后发现了console.log（4），于是输出4。这里有个细节要注意的是，macroTask一次，micro清空，macroTask一次，microTask清空，按照这样的交替的顺序来，并且在flush microTask的时候，实际上中途产生的microtask，例如Promise.resolve()这段代码，首先Promise属于microTask，只有当Promise是pending的状态的时候，才会在下一次eventLoop中去执行microTask，但是现在直接就Promise.resolve()了，相当于同步的形式往microTask加入了task，因此会继续运行console.log（'before timeout'），运行完这段代码，实际上promise还是同步形式的resolve了，所以在下一个then中，还是往microTask中插入task，然后继续运行microTask,最后Promise.resolve又是同步访问了microTask，因此最后仍然会执行console.log('also before timeout')，执行到这里微队列就完了，然后再去找下一个macroTask，然后执行console.log（4）。<br/>
现在修改一下代码,变成如下模式:

	setTimeout(_ => console.log(4))
    
    new Promise(resolve => {
      resolve()
      console.log(1)
    }).then(_ => {
      console.log(3)
      new Promise(function(resolve,reject) {
          setTimeout(function() {
			  console.log(5);
		  },0)
		  setTimeout(function() {
			  console.log(6);
			  resolve();
		  },0)
	  }).then(_ => {
      console.log('before timeout')
      }).then(_ => {
    Promise.resolve().then(_ => {
      console.log('also before timeout')
    })
      })
    })
    console.log(2)
![](https://i.imgur.com/QAa8bPQ.png)

输出的结果如图所示，这种情况下，console.log('before timeout')，console.log('also before timeout')会在1，2，3，4之后输出，1，2，3输出顺序跟前一个例子没区别，当console.log(3)的时候，虽然new Promise，但是这个promise并不是resolve或者reject状态，而是pending状态，因为它不是同步代码，而是2个setTimeout（），其中resolve（）放在了第二个setTimeout中，反正resolve（）没有调用，所以promise是pending状态，因为promise里面的代码为MacroTask的代码，导致resolve会在清理macroTask的时候才会调用而不是现在，但是当前是清理micro的时候，因此后续的then全部全部都不会执行，而是放在下个loop执行，所以此时micro队列已经完了，因此现在去找最早的macrotask，找到了console.log(4),然后再去找micro队列，发现没有，于是又去找macro队列，发现了console.log(5)，然后又去找micro发现还是没有，然后再换到macro，发现了console.log(6)和resolve()二个同步函数，因此macro运行完之后，promise已经是resolve状态了，开始清理micro的时候，console.log（'before timeout'）被放入micro中，然后运行，紧接着由于没有显式调用reslove因此默认就是resolve状态，于是Promise还是resolve状态，后续会一直运行到console.log('also before timeout');<br/>
讨论到这里，我想的话，在代码层级已经非常清晰了，下面根据那个兄弟的代码，来看看浏览器中的运行机制。代码如下：


    <div id="outer">
    	<div id="inner">111</div>
    </div>
    <script>
	    const $inner = document.querySelector('#inner')
	    const $outer = document.querySelector('#outer')
	    
	    function handler () {
	      console.log('click') // 直接输出
	    
	      Promise.resolve().then(_ => console.log('promise')) // 注册微任务
	    
	      setTimeout(_ => console.log('timeout')) // 注册宏任务
	    
	      requestAnimationFrame(_ => console.log('animationFrame')) // 注册宏任务
	    
	      $outer.setAttribute('data-random', Math.random()) // DOM属性修改，触发微任务
	    }
	    
	    new MutationObserver(_ => {
	      console.log('observer')
	    }).observe($outer, {
	      attributes: true
	    })
	    
	    $inner.addEventListener('click', handler)
	    $outer.addEventListener('click', handler)
    <script>

鼠标点击111，输出的结果是：
![](https://i.imgur.com/DwGW5WY.png)

按照那位兄台的解释就是，鼠标第一次点击属于第一个I/O的macroTask，然后开始执行同步代码，发现只有console.log('click')属于同步代码，Promise放入micro，setTimeout放入macro，requestAnimationFrame放入macro，setAttribute放入micro，同步代码执行完后，开始执行找到最早的macro，发现macro的click I/O操作，已经完成且变成了null，于是开始处理微任务，按先后顺序输出promise，observer，然后就没有micro任务了，但是click事件进行冒泡，会在冒到外层的div中，这一步依旧属于macro的click事件，并且优先级高于已存在的macro，于是继续执行handler()一次，运行同步代码跟之前一样，继续再输出一遍promise，observer，由于已经没有冒泡的click事件了，因此执行之前存入macro中的宏任务，由于setAttribute同步代码会导致macro中，animationFrame先输出，因此它们之间的顺序会调整，然后紧接着输出timeout，通过这个案例说明了，macrotask的特点是，一次取一个task进入到macrotask中，但是这个顺序会受到同步代码的最终影响。

当使用$inner.click()的时候，代码的执行结果变成了下面这样。
![](https://i.imgur.com/3bL7xHC.png)

![](https://i.imgur.com/hZjXuIe.png)
最后的宏队列到底是timeout先输出还是animation先输出，这个变成了一个随机的事件，但是可以肯定的是，inner.click(),底层实现，相当于在click方法中调用了2次handle，也就是handel（），handle（），连续运行2次，第一次收集一波micro和macro，但是同步代码没运行完，然后再执行一次收集一波micro和macro，因此click连续输出2次，因为click是同步代码，然后由于这时候的macro是<script></script>加载的I/O，属于macro，因此macro为null，开始flush微队列，observer可能默认有个去重的操作，因此只输出一次，但是能够说明的问题是，2个handle（）是一起放入call stack进行执行的，优化去重，最后导致observer执行一次，后面macro还是按照animation，timeout或者timeout，annimation这个随机输出，但是animation一定是第一次handle的在前，第二次在后，timeout也是，只是这2组之间的顺序随机出现。这里的handle是一次一次执行。根据call stack可以看到。
## 疑问 ##
这里浏览器中存在的问题在于，到底冒泡一个事件算同步代码还是macro？按照第一波输出的结果，应该把实实在在点击产生的io冒泡的过程算作macro且优先级高于已存在的macro才分析得通，用鼠标点击肯定属于macro，而通过$inner.click(),当前这个click算同步代码，它在click内部完成多次handle的执行。浏览器里面的UI，dom，settimeout，promise的整体，较为复杂，因此先分析这么多。