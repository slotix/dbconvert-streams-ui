# DBConvert Streams UI

## Overview

DBConvert Streams is a powerful application for efficient data migration and real-time Change Data Capture (CDC) replication between databases. This repository contains the frontend user interface component that works alongside other DBConvert Streams services in your self-hosted environment. Visit [streams.dbconvert.com](https://streams.dbconvert.com) to learn more about the platform.

## Related Repositories

- Backend (API/reader/writer): `../dbconvert-stream`
- Website + licensing (Sentry): `../dbconvert-streams-website`

## Key Features

### Quick Actions Dashboard
- Create and manage database connections
- Configure and monitor data streams
- Access comprehensive system status monitoring
- Manage account settings and API keys

### Database Connection Management
- Support for MySQL and PostgreSQL databases
- Secure SSL/TLS configuration options
- Easy-to-use connection testing and validation
- Flexible connection viewing options (card/table layouts)
- Clone and modify existing connections

### Advanced Stream Configuration
- Multiple data transfer modes:
  - Convert/Migrate Data
  - Stream/Change Data Capture (CDC)
- Customizable stream settings:
  - Configurable data bundle sizes
  - Adjustable reporting intervals
  - Custom SQL query support
  - Table structure management options

### Real-Time Monitoring
- Visual progress tracking for stream stages
- Detailed performance metrics:
  - Input/output event counts
  - Data transfer sizes
  - Average transfer rates
- Comprehensive system logs
- Stream control options (Start/Pause/Stop)

### System Status Overview
Live monitoring of key components:
- Stream API status
- Reader/Writer services
- NATS messaging system
- Vault security service

## Screenshots

Here are some screenshots to help you get familiar with the UI:

- **Dashboard Overview**
  ![Dashboard Overview](docs/screenshots/home.png)

- **Connection Management**
  ![Connection Management](docs/screenshots/connection-management.png)

- **Stream Configuration**
  ![Stream Configuration](docs/screenshots/streams-configuration.png)

- **Real-Time Monitoring**
  ![Real-Time Monitoring](docs/screenshots/real-time-monitoring.png)

## Need Help?

For detailed information about using DBConvert Streams, visit our [documentation](https://docs.dbconvert.com/guide/dashboard-ui-guide.html). For deployment instructions, check our [deployment guide](https://streams.dbconvert.com/deploy). If you need assistance, contact our support team at [streams@dbconvert.com](mailto:streams@dbconvert.com).

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
