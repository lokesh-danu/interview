import amqplib from 'amqplib';

let channel: amqplib.Channel | null = null;

/**
 * Connect to RabbitMQ and return channel.
 */
export async function connectQueue(): Promise<amqplib.Channel> {
  if (channel) {
    return channel;
  }

  const url = process.env.RABBITMQ_URL || 'amqp://localhost';
  const connection = await amqplib.connect(url);
  channel = await connection.createChannel();

  // Declare queues
  await channel.assertQueue('document.process', { durable: true });
  await channel.assertQueue('chat.message', { durable: true });
  await channel.assertQueue('agent.run', { durable: true });

  console.log('Connected to RabbitMQ');

  // Handle connection close
  connection.on('close', () => {
    console.log('RabbitMQ connection closed');
    channel = null;
  });

  return channel;
}

/**
 * Publish a message to a queue.
 */
export async function publish(queue: string, message: object): Promise<void> {
  const ch = await connectQueue();
  ch.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
}

/**
 * Close the RabbitMQ connection.
 */
export async function closeQueue(): Promise<void> {
  if (channel) {
    await channel.close();
    channel = null;
  }
}
