    /*
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
    */
	
	/*
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
	*/
	
	
	
const $inner = document.querySelector('#inner')
const $outer = document.querySelector('#outer')
var count = 1;

function handler () {
  var i = count++;
  console.log('click') // 直接输出
  
  Promise.resolve().then(_ => console.log('promise'+i)) // 注册微任务

  setTimeout(_ => console.log('timeout'+i)) // 注册宏任务

  requestAnimationFrame(_ => console.log('animationFrame'+i)) // 注册宏任务

  $outer.setAttribute('data-random', Math.random()) // DOM属性修改，触发微任务
}

new MutationObserver(_ => {
  console.log('observer')
}).observe($outer, {
  attributes: true
})

$inner.addEventListener('click', handler)
$outer.addEventListener('click', handler)

$inner.click();