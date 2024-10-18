const message = ref('')
const setupLogSource = () => {
  const eventSource = new EventSource('http://127.0.0.1:8020/api/v1/log')

  eventSource.addEventListener('message', (event) => {
    // Assuming the data is in event.data, modify this line accordingly
    // message.value = JSON.parse(event.data);
    message.value = event.data
    // console.log(message.value);
  })

  // Handle errors and close events if needed
  eventSource.addEventListener('error', (error) => {
    console.error('Error:', error)
    eventSource.close()
    // Optionally, handle reconnection logic here
    setTimeout(setupLogSource, 1000)

    // setTimeout(() => setupLogSource(), 10000);
  })

  eventSource.addEventListener('close', () => {
    console.log('Connection closed.')
    // Optionally, handle reconnection logic here
    // setTimeout(() => setupLogSource(), 10000);
    setTimeout(setupLogSource, 1000)
  })
}
