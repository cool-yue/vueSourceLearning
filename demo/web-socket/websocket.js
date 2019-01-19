console.log("aaa");
const contentBox = document.querySelector("#contentBox");
const socket = new WebSocket('ws://localhost:8087');
socket.addEventListener('open', function (event) {
    socket.send('Hello Server!');
});

socket.addEventListener('message', function (event) {
    console.log('Message from server ', event.data);
    contentBox.textContent = event.data;
});

setInterval(function() {
    socket.send('Hello Server!');
},1000);