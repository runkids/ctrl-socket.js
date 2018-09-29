### [![npm](https://img.shields.io/npm/v/ctrl-socket.svg)](https://www.npmjs.com/package/ctrl-socket) CtrlSocket.js

#### Install
`npm i ctrl-socket`

Javascript
```javascript
import CtrlSocket from "ctrl-socket";
```
HTML
```HTML
<script src="./ctrlsocket.min.js"></script>
```


#### Usage
 - Create
    ```javascript
    const url = 'wss://xxxxxxxxx' //websocket url
    const ws = new CtrlSocket(url)
    ```

- Methods
1.  subscribe
    ```javascript
    ws.subscribe({
        onopen: function ,
        onmessage: function,
        onerror: function,
        onclose: function
    })
    ```

    Call back function , will call onmessage

      ```javascript
      ws.subscribe( (e)=>console.log(e.data) )
      // same
      ws.subscribe({
        onmessage: (e)=>console.log(e.data)
      })
      ```
    Return CtrlSocket Object

2. retry
    
    When websocket state is closed and closed code != 1000 will reconnect
  
    ws.retry(count: Number,interval: Number)

    ```javascript
    retry(3, 1000) //reconnect to server 3 times per second
    retry(3) //reconnect to server 3 times (interval default value is 5 seconds)
    retry() //reconnect to server until server response
    ```
    Return CtrlSocket Object
3. connect

    connect to server , readyState changes to OPEN
    ```javascript
    ws.connect()
    ```
4. disconnect

    disconnect , readyState changes to CLOSED
    ```javascript
    ws.disconnect()
    ```
5. reconnect

    reconnect to server
    ```javascript
    ws.reconnect(code = 1000, reason = 'Normal closure')
    ```
6. send

    send a message to server
    ```javascript
    ws.send('Hi there!') // String

    ws.send({
      message: 'Hi there!' //Object
    })
    ```
7. readyState
    get websocket state
    ```javascript
    const state = ws.readyState
    ```
    in Vue you can ...
    ```javascript
    ...
    computed:{
      getState(){
        let msg =''
        if(this.state===1){
          msg = 'Open'
        }
        ...
        return msg
      }
    },
    watch:{
      state(newValue,oldValue){
        //todo
      }
    },
    created(){
      ...
      this.ws = new CtrlSocket(url)
      this.state = this.ws.readyState
    }
    ...
    ```

8. heartBeat
    Check websocket still connect to server, if loss connection will call onclose.
    
    ws.heartBeat(interval: Number, message)
    `interval--> default 30 seconds`

    ```javascript
      // use with retry()
      ws.retry()
      .heartBeat(3000,{
         comment: 'heartBeat' //if loss connection , reconnect until server response
     })
      ws.heartBeat() //if loss connection do nothing , readyState = CLOSED
    ```
      Return CtrlSocket Object


#### Example

```javascript
const connectURL = 'wss://echo.websocket.org'

function onmessage (response) {
    if (typeof response.data === 'string') {
        // todo
    }
}

const ws = new CtrlSocket(connectURL)
.heartBeat(60000,'ping')
.retry(3)
.subscribe({
    onopen: () => console.log('OPEN') ,
    onclose: () => console.log('CLOSED'),
    onerror: () => console.log('Error')
    onmessage
})

```