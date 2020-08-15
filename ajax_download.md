## ajax downlaod ##

ajax以前都认为是不能下载的，因为ajax的全称是异步的javascript和xml，也就是说本质上是浏览器交给其他线程去跑ajax然后读取返回的结果，通过回调来返回`文本`,这里能不能是二进制呢？答案是可以。但是ajax并不能触发浏览器的下载动作，因为拿到二进制也好，文本也好，都是通过回调函数来返回，相当于仅仅在内存中在执行，并不涉及到浏览器行为的交互。

使用原生的`XMLHttpRequest`的`responseType`属性。

    const xhr = new XMLHttpRequest();
    xhr.reponseType = "blob";

这里要注意的是设置了`reponseType`,如果服务器端返回的不是对应的类型，那就响应直接是空了。

现在假定服务器返回了二进制流。

    xhr.onload = function () {
        console.log(xhr.response);
    }

如果响应的是blob,那么此时`xhr.repsonse`是blod对象。

有了blob，那么现在就来触发浏览器的下载动作。

触发下载有很多方式：

1.创建一个a标签，然后模拟点击效果

2.window.location.href= "xxx";

3.iframe具备src属性。

这里实现第一种，a标签的href既能够喂一个`DataURL`也能够喂一个`ObjectURL`,下面是两者的实现方式。

    function createFileByObjectURL(blob, fileName = "印章审批表格.xlsx") {
      const objectURL = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectURL;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(objectURL);
    }
    



    function createFileByDataURL(blob, fileName = "印章审批表格.xlsx") {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(blob);
      fileReader.addEventListener("load", function () {
      const link = document.createElement("a");
        link.href = fileReader.result;
        link.download = fileName;
        link.click();
        fileReader.removeEventListener("load");
      });
    }

原则上，DataURL通常是base64本地编码。喂给img的src能够就相当于一个资源。

基于ajax的下载就总结到这里。