# Swasthya Project: AI-Powered Hospital Management System

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

A comprehensive, full-stack AI agent system for hospital operations management, featuring intelligent orchestration, ML-powered predictions, and hybrid cloud deployment capabilities.

## 🌟 Overview

Swasthya is an advanced AI-driven system designed to optimize hospital operations through a multi-agent architecture. The system combines TypeScript-based orchestration with Python ML agents to handle critical hospital workflows including patient triage, staff scheduling, demand forecasting, and discharge planning.

### System Statistics

- **Total Services**: 18 containerized microservices
- **AI Agents**: 6 specialized ML/optimization agents
- **Languages**: TypeScript (orchestration) + Python (ML/optimization)
- **API Endpoints**: 50+ RESTful endpoints
- **Database Tables**: 8 main tables + 2 views
- **Federated Learning**: Privacy-preserving multi-hospital training support
- **Dataset Support**: Sample datasets for FL training included

### Key Features

- **🤖 Multi-Agent Architecture**: Six specialized AI agents + orchestration layer
- **📊 MLflow Integration**: Complete ML lifecycle management with experiment tracking and model registry
- **🔄 Hybrid Deployment**: Flexible cloud training with secure on-premises inference
- **🔐 Federated Learning**: Multi-site collaborative training without data sharing (Flower Framework)
- **⚡ Real-time Operations**: Event-driven and scheduled workflow execution
- **🏥 Healthcare-Specific**: Built for hospital workflows with regulatory compliance in mind
- **🐳 Containerized**: Fully Dockerized (18 services) for easy deployment and scalability
- **📝 Well-Documented**: Comprehensive inline documentation and API specifications

## 📐 System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Orchestrator (Node.js/TS)                  │
│                         Supervisor Agent                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Workflow Coordination  • Agent Health Monitoring      │  │
│  │  • Database Management    • Scheduled Jobs (Cron)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────┬─────────────┬──────────────┬─────────────┬────────┘
             │             │              │             │
    ┌────────▼───┐   ┌────▼────┐   ┌────▼────┐   ┌───▼──────┐
    │  Demand    │   │  Staff  │   │  ER/OR  │   │  Triage  │
    │  Forecast  │   │Schedule │   │Schedule │   │& Acuity  │
    │   Agent    │   │  Agent  │   │  Agent  │   │  Agent   │
    └────────────┘   └─────────┘   └─────────┘   └──────────┘
            │              │              │             │
         (Prophet/      (OR-Tools)    (OR-Tools     (XGBoost/
          ARIMA)                       + ML)          NLP)
                     
    ┌────────────┐   ┌──────────────────────────────────────┐
    │ Discharge  │   │         MLflow + PostgreSQL          │
    │  Planning  │   │   • Model Registry  • Tracking       │
    │   Agent    │   │   • Experiments     • Artifacts      │
    └────────────┘   └──────────────────────────────────────┘
    (XGBoost +
     Rules)
```

### Federated Learning Architecture

```
                  ┌─────────────────────────┐
                  │   Flower FL Servers     │
                  │  ┌──────┐   ┌──────┐   │
                  │  │Demand│   │Triage│   │
                  │  │:8087 │   │:8086 │   │
                  │  └───┬──┘   └──┬───┘   │
                  └──────┼─────────┼────────┘
                         │         │
         ┌───────────────┼─────────┼───────────────┐
         │               │         │               │
    ┌────▼────┐     ┌───▼───┐ ┌──▼────┐     ┌────▼────┐
    │Hospital │     │Hospital│ │Hospital│     │Hospital │
    │   A     │     │   B   │ │   C   │     │   D     │
    │ Client1 │     │Client2│ │Client3│     │Client N │
    └─────────┘     └───────┘ └───────┘     └─────────┘
    Local Data      Local Data Local Data    Local Data
    (Never Shared)  (Private)  (Private)     (Private)
```

## 📁 Project Structure

```
swasthya-MumbaiHacks-Project/
├── agents/                          # ML Agent Services (Python)
│   ├── demand_forecast/            # Time-series forecasting agent
│   │   ├── api.py                  # FastAPI service
│   │   ├── model.py                # Prophet/ARIMA models
│   │   ├── train.py                # Training script
│   │   ├── mlflow_tracking.py      # MLflow integration
│   │   ├── fl_run_client.py        # FL client runner
│   │   ├── config.py & Dockerfile
│   │   └── requirements.txt
│   ├── staff_scheduling/           # Staff scheduling optimizer
│   │   ├── api.py & scheduler.py   # CP-SAT optimization
│   │   └── config.py, Dockerfile, requirements.txt
│   ├── eror_scheduling/            # ER/OR scheduling agent
│   │   ├── api.py & scheduler.py   # Queue + OR logic
│   │   └── config.py, Dockerfile, requirements.txt
│   ├── discharge_planning/         # Discharge readiness predictor
│   │   ├── api.py & model.py       # XGBoost + rules
│   │   └── config.py, Dockerfile, requirements.txt
│   └── triage_acuity/              # Patient triage classifier
│       ├── api.py & model.py       # XGBoost classifier
│       ├── text_parser.py          # NLP parsing
│       ├── fl_run_client.py        # FL client runner
│       └── config.py, Dockerfile, requirements.txt
│
├── orchestrator/                    # Central Orchestrator (Node.js/TS)
│   ├── src/
│   │   ├── agents/                 # Agent client library
│   │   ├── config/                 # Configuration
│   │   ├── database/               # Database layer
│   │   ├── middleware/             # Auth middleware
│   │   ├── routes/                 # API routes
│   │   ├── scheduler/              # Cron jobs
│   │   ├── supervisor/             # Orchestration logic
│   │   └── utils/                  # Utilities
│   ├── package.json
│   └── tsconfig.json
│
├── federated_learning/              # Federated Learning (Flower)
│   ├── server/                     # FL servers
│   │   ├── demand_server.py       # Demand FL coordinator
│   │   ├── triage_server.py       # Triage FL coordinator
│   │   └── strategy.py            # Custom aggregation strategy
│   ├── client/                     # FL clients
│   │   ├── demand_client.py       # Demand FL client
│   │   ├── triage_client.py       # Triage FL client
│   │   └── serde.py               # Serialization utilities
│   ├── Dockerfile.server
│   ├── Dockerfile.client
│   ├── requirements-server.txt
│   └── requirements-client.txt
│
├── data/                            # Database Schemas
│   ├── 01_create_databases.sql    # MLflow DB creation
│   └── init_database.sql          # Main schema & seed data
│
├── datasets/                        # FL Training Datasets
│   ├── demand_client_*.csv        # Per-hospital demand data
│   └── triage_client_*.csv        # Per-hospital triage data
│
├── mlflow/                          # MLflow Configuration
│   └── Dockerfile
│
├── deployment/                      # Deployment configurations
│
├── docker-compose.yml               # 18-service orchestration
├── env.example                      # Environment template
├── .gitignore
└── README.md                        # This file
```

## 🚀 Quick Start

### Getting Started

**Recommended**: Use Docker Compose for the full system with all 18 services - [See below](#installation)

### Prerequisites

**For Docker Deployment (Easiest)**:
- Docker 20.10+
- Docker Compose 2.0+

**For Local Development**:
- Node.js 18+ (for orchestrator)
- Python 3.10+ (for ML agents)
- PostgreSQL 15+ (or use Docker container)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd swasthya
   ```

2. **Configure environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration (optional - defaults work for local development)
   ```

3. **Prepare datasets for Federated Learning (optional)**
   
   If you want to use the FL features, ensure datasets are in place:
   ```bash
   # Check if sample datasets exist
   ls datasets/
   
   # Should contain:
   # - demand_client_1.csv, demand_client_2.csv, demand_client_3.csv
   # - triage_client_1.csv, triage_client_2.csv, triage_client_3.csv
   
   # If not present, you can create sample datasets or the FL services
   # will fail gracefully without affecting other services
   ```

4. **Start all services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **Initialize the database**
   ```bash
   # Database will be initialized automatically on first run
   # Or manually run:
   docker-compose exec postgres psql -U postgres -d swasthya_db -f /docker-entrypoint-initdb.d/init.sql
   ```

6. **Verify services are running**
   ```bash
   # Check all containers (should see 18 containers running)
   docker-compose ps
   
   # Core Services:
   # - swasthya-postgres (PostgreSQL database)
   # - swasthya-mlflow (MLflow tracking server)
   # - swasthya-orchestrator (Main orchestrator)
   
   # ML Agent Services (5):
   # - swasthya-demand-forecast
   # - swasthya-staff-scheduling
   # - swasthya-eror-scheduling
   # - swasthya-discharge-planning
   # - swasthya-triage-acuity
   
   # Federated Learning Services (10):
   # - swasthya-fl-demand-server + 3 clients
   # - swasthya-fl-triage-server + 3 clients
   
   # Test orchestrator
   curl http://localhost:3000
   
   # Test MLflow
   curl http://localhost:5000
   
   # Test FL servers
   # Note: FL servers don't have HTTP endpoints, check logs instead:
   docker-compose logs fl-demand-server | tail -20
   docker-compose logs fl-triage-server | tail -20
   ```

### Access Points

**Core Services:**
- **Orchestrator API**: http://localhost:3000
- **MLflow UI**: http://localhost:5000

**ML Agent Services:**
- **Demand Forecast**: http://localhost:8001
- **Staff Scheduling**: http://localhost:8002
- **ER/OR Scheduling**: http://localhost:8003
- **Discharge Planning**: http://localhost:8004
- **Triage & Acuity**: http://localhost:8005

**Federated Learning Servers:**
- **FL Triage Server**: http://localhost:8086
- **FL Demand Server**: http://localhost:8087

**Interactive API Documentation:**
- Each agent provides Swagger/OpenAPI docs at `/docs` endpoint
- Example: http://localhost:8001/docs, http://localhost:8005/docs, etc.

## 🧩 Agent Details

### 1. Demand Forecast Agent
**Port**: 8001 | **Technology**: Prophet/ARIMA/Moving Average

Predicts patient volumes for hospital resource planning.

**Key Features**:
- Time-series forecasting with seasonality
- Multiple model support (Prophet, ARIMA)
- Confidence intervals
- MLflow experiment tracking

**API Endpoints**:
- `POST /predict` - Generate forecast
- `GET /health` - Health check
- `POST /train` - Trigger model training

### 2. Staff Scheduling Agent
**Port**: 8002 | **Technology**: OR-Tools (CP-SAT)

Optimizes staff schedules based on demand forecasts and constraints.

**Key Features**: 
- Constraint programming optimization
- Fair workload distribution
- Shift coverage guarantees
- Role-based assignments

**API Endpoints**:
- `POST /schedule` - Generate optimized schedule
- `GET /constraints/default` - Get default constraints

### 3. ER/OR Scheduling Agent
**Port**: 8003 | **Technology**: OR-Tools + ML

Manages emergency room queue prioritization and operating room scheduling.

**Key Features**:
- Dynamic ER queue management by acuity
- OR scheduling optimization
- Surgery duration prediction
- Real-time patient prioritization

**API Endpoints**:
- `POST /er/add-patient` - Add patient to ER queue
- `GET /er/next-patient` - Get next patient
- `POST /or/schedule` - Schedule OR cases

### 4. Discharge Planning Agent
**Port**: 8004 | **Technology**: XGBoost + Rules Engine

Identifies discharge-ready patients using hybrid ML and rule-based approach.

**Key Features**:
- ML-based readiness scoring
- Clinical rule validation
- Social factor consideration
- Discharge date estimation

**API Endpoints**:
- `POST /analyze` - Analyze discharge candidates
- `POST /analyze-single` - Single patient analysis
- `GET /criteria` - Get discharge criteria

### 5. Triage & Acuity Agent
**Port**: 8005 | **Technology**: XGBoost + NLP

AI-assisted patient triage and acuity assessment.

**Key Features**:
- NLP symptom extraction
- Vital sign analysis
- Red flag detection
- Rule-based overrides for safety

**API Endpoints**:
- `POST /triage` - Triage patient
- `POST /batch-triage` - Batch triage
- `POST /override` - Log nurse override

### 6. Supervisor/Orchestrator Agent
**Port**: 3000 | **Technology**: Node.js + TypeScript

Central coordination hub for all agents.

**Key Features**:
- Workflow orchestration
- Scheduled job management
- Agent health monitoring
- Database persistence

**API Endpoints**:
- `POST /api/forecast/run` - Trigger forecast
- `POST /api/triage` - Process triage
- `POST /api/workflow/daily` - Run daily workflow
- `GET /api/agents/health` - Check agent health

### 7. Federated Learning Services
**Ports**: 8086 (Triage Server) & 8087 (Demand Server) | **Technology**: Flower Framework v1.7.0

Enables privacy-preserving collaborative machine learning across multiple hospitals without centralizing raw patient data. Each hospital trains on its local dataset, and only model updates (not data) are shared.

**Architecture**:
```
FL Triage Server (8086)          FL Demand Server (8087)
        ↓                                 ↓
  ┌─────┴─────┐                    ┌─────┴─────┐
  ↓     ↓     ↓                    ↓     ↓     ↓
Client1 Client2 Client3          Client1 Client2 Client3
 (Hospital A)                     (Hospital A)
 (Hospital B)                     (Hospital B)
 (Hospital C)                     (Hospital C)
```

**Components**:

1. **Federated Learning Servers**:
   - `fl-demand-server` (Port 8087): Coordinates federated training rounds for demand forecasting using ARIMA models
   - `fl-triage-server` (Port 8086): Coordinates federated training rounds for triage classification using XGBoost

2. **Federated Learning Clients**:
   - `fl-demand-client-{1,2,3}`: Train ARIMA forecasting models on local hospital demand data
   - `fl-triage-client-{1,2,3}`: Train XGBoost classifiers on local hospital triage data

**Key Features**:
- **Privacy-Preserving**: Raw patient data never leaves the hospital
- **Collaborative Learning**: Models benefit from multi-site data without data sharing
- **Configurable Rounds**: Default 5 training rounds, configurable in server code
- **Best Model Strategy**: Automatically selects best performing model across sites
- **Metrics**: 
  - Demand: Uses negative RMSE (lower is better)
  - Triage: Uses accuracy (higher is better)

**Dataset Requirements**:

Place client datasets in `datasets/` directory:

*Demand Forecasting Datasets*:
- `datasets/demand_client_1.csv`
- `datasets/demand_client_2.csv`
- `datasets/demand_client_3.csv`

Format: `date,volume` (date in YYYY-MM-DD, volume as numeric)

*Triage Datasets*:
- `datasets/triage_client_1.csv`
- `datasets/triage_client_2.csv`
- `datasets/triage_client_3.csv`

Format: Feature columns + `acuity_label` (1-5, where 1=critical, 5=non-urgent)

**Usage**:

```bash
# Start full FL stack with Docker Compose
docker-compose up -d

# View FL server logs
docker-compose logs -f fl-demand-server
docker-compose logs -f fl-triage-server

# View specific client logs
docker-compose logs -f fl-demand-client-1
docker-compose logs -f fl-triage-client-1

# Monitor training progress (servers coordinate 5 rounds by default)
# Each round: clients train locally → send updates → server aggregates → repeat
```

**Files & Structure**:
```
federated_learning/
├── server/
│   ├── demand_server.py       # Demand FL orchestrator
│   ├── triage_server.py       # Triage FL orchestrator
│   └── strategy.py            # BestModelStrategy implementation
├── client/
│   ├── demand_client.py       # Demand client training logic
│   ├── triage_client.py       # Triage client training logic
│   └── serde.py              # Model serialization utilities
├── Dockerfile.server          # FL server container
├── Dockerfile.client          # FL client container
├── requirements-server.txt    # Server dependencies (Flower, NumPy, sklearn)
└── requirements-client.txt    # Client dependencies (Flower, pandas, xgboost, etc.)
```

**Integration with Main Agents**:
- FL-trained models can be exported and loaded into main demand_forecast and triage_acuity agents
- Both demand_forecast and triage_acuity agents include `fl_run_client.py` for direct FL participation
- Provides foundation for multi-hospital deployments while maintaining data sovereignty
- Useful for hospitals that want to benefit from collaborative learning without violating data privacy regulations

**Alternative Client Execution**:
FL clients can also be run directly from agent directories:
```bash
# From demand_forecast agent
cd agents/demand_forecast
python fl_run_client.py --cid 1 --server-address localhost:8087

# From triage_acuity agent
cd agents/triage_acuity
python fl_run_client.py --cid 1 --server localhost:8086
```

## 🛠️ Development

### Local Development Setup

#### Orchestrator (TypeScript)

```bash
cd orchestrator
npm install
npm run dev  # Development mode with hot reload

# Or build for production
npm run build
npm start
```

#### ML Agents (Python)

```bash
cd agents/demand_forecast  # or any other agent
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python api.py
```

#### Federated Learning Development

```bash
# Start FL servers
cd federated_learning
python -m server.demand_server  # Port 8087
python -m server.triage_server  # Port 8086

# Start FL clients (in separate terminals)
python -m client.demand_client --cid 1 --server-address localhost:8087
python -m client.triage_client --cid 1 --server localhost:8086
```

### Running Tests

```bash
# Orchestrator tests
cd orchestrator
npm test

# Python agent tests
cd agents/demand_forecast
pytest
```

### Building for Production

```bash
# Build all Docker images (all 18 services)
docker-compose build

# Or build individual services
docker-compose build orchestrator
docker-compose build demand-forecast
docker-compose build triage-acuity

# Build only FL services
docker-compose build fl-demand-server fl-demand-client-1
docker-compose build fl-triage-server fl-triage-client-1

# Build with no cache (clean build)
docker-compose build --no-cache

# Build specific agent
cd agents/demand_forecast
docker build -t swasthya-demand-forecast .
```

## 📊 Database Schema

The system uses PostgreSQL with the following main tables:

- **forecasts**: Patient volume predictions
- **staff**: Hospital staff information
- **staff_schedules**: Generated staff schedules
- **triage_decisions**: Triage assessments
- **er_queue**: Emergency room patient queue
- **or_schedules**: Operating room schedules
- **inpatients**: Current inpatient information
- **discharge_recommendations**: Discharge readiness assessments

**Database Files**:
- `data/01_create_databases.sql` - Creates MLflow database
- `data/init_database.sql` - Main schema with tables, views, and sample data

## 🔐 Security

### Production Deployment Checklist

- [ ] Change default database credentials
- [ ] Update API_KEY in .env
- [ ] Enable HTTPS/TLS for all services
- [ ] Configure firewall rules
- [ ] Set up authentication for MLflow UI
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Data encryption at rest
- [ ] Secure inter-service communication

### HIPAA Compliance Considerations

- PHI data should remain on-premises
- Use de-identified data for cloud training
- Implement access controls and audit trails
- Ensure data encryption (at rest and in transit)
- Regular security assessments

### Federated Learning Privacy Benefits

- **No Data Centralization**: Raw patient data never leaves the hospital
- **Local Training**: Each hospital trains on its own data locally
- **Model-Only Sharing**: Only encrypted model updates are shared
- **Differential Privacy**: Can be enhanced with DP techniques
- **Compliance-Friendly**: Satisfies data locality requirements
- **Multi-Site Learning**: Benefits from collaborative learning without data sharing

## 📈 Monitoring & Logging

### Logs

Logs are stored in respective service directories:
- Orchestrator: `orchestrator/logs/`
- Agents: `agents/{agent_name}/logs/`

### MLflow Tracking

Access MLflow UI at http://localhost:5000 to:
- View experiment runs
- Compare model performance
- Manage model versions
- Track artifacts

### Health Checks

```bash
# Check all agent health
curl http://localhost:3000/api/agents/health

# Individual agent health
curl http://localhost:8001/health  # Demand Forecast
curl http://localhost:8005/health  # Triage
```

## 🚢 Deployment

### Docker Compose (Recommended)

The system includes 18 containerized services orchestrated by Docker Compose:

**Infrastructure (2)**:
- PostgreSQL database
- MLflow tracking server

**Core Services (1)**:
- Orchestrator (Node.js/TypeScript)

**ML Agent Services (5)**:
- Demand Forecast Agent
- Staff Scheduling Agent
- ER/OR Scheduling Agent
- Discharge Planning Agent
- Triage & Acuity Agent

**Federated Learning (10)**:
- FL Demand Server + 3 Clients
- FL Triage Server + 3 Clients

```bash
# Production deployment (all 18 services)
docker-compose up -d

# View all container status
docker-compose ps

# View logs for specific service
docker-compose logs -f orchestrator
docker-compose logs -f demand-forecast
docker-compose logs -f fl-demand-server

# View logs for all services
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Restart specific service
docker-compose restart triage-acuity

# Scale agent services (if needed)
docker-compose up -d --scale demand-forecast=3
```

### Kubernetes (Advanced)

Kubernetes manifests can be generated from docker-compose:

```bash
kompose convert -f docker-compose.yml
kubectl apply -f .
```

### Hybrid Deployment

**Cloud (Training)**:
- MLflow tracking server
- Model training pipelines
- Large-scale data processing

**On-Premises (Inference)**:
- Orchestrator
- All ML agent inference services
- PostgreSQL database
- Real-time patient data

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 💻 Technology Stack

### Orchestration & Backend
- **Node.js 18+** - Runtime environment
- **TypeScript 5.3** - Type-safe development
- **Express.js 4.18** - Web framework
- **PostgreSQL 15** - Primary database
- **Winston** - Logging
- **node-cron** - Scheduled jobs
- **Axios** - HTTP client for inter-service communication

### Machine Learning & Optimization
- **Python 3.10+** - ML runtime
- **FastAPI** - High-performance Python web framework
- **scikit-learn 1.4** - ML utilities
- **XGBoost 2.0** - Gradient boosting for classification
- **Prophet** - Time-series forecasting
- **statsmodels 0.14** - ARIMA models
- **Google OR-Tools** - Constraint programming & optimization
- **Transformers (Hugging Face)** - NLP capabilities
- **pandas 2.1** - Data manipulation
- **NumPy 1.26** - Numerical computing

### Federated Learning
- **Flower (flwr) 1.7.0** - Federated learning framework
- **Custom BestModelStrategy** - Best model aggregation
- **Privacy-Preserving Architecture** - No raw data sharing

### MLOps & Monitoring
- **MLflow 2.9** - ML lifecycle management
  - Experiment tracking
  - Model registry
  - Model versioning
  - Artifact storage

### DevOps & Deployment
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **PostgreSQL** - Backend storage for MLflow

### Development Tools
- **Git** - Version control
- **pytest** - Python testing
- **Jest** - Node.js testing (planned)

## 🙏 Acknowledgments

- Hospital staff and administrators for domain expertise
- Open-source ML and optimization libraries
- **Flower Framework** team for federated learning capabilities
- Healthcare AI research community
- Google OR-Tools for optimization solvers
- MLflow team for ML lifecycle management

## 📞 Support

### Getting Help

**Quick Help:**
- **API Documentation**: Each agent provides interactive Swagger/OpenAPI docs at `/docs` endpoint
- **Configuration**: Check `env.example` for environment variable settings
- **Code Structure**: Review the Project Structure section above

**For Developers:**
- Inline code documentation in each agent and orchestrator
- MLflow UI at http://localhost:5000 for ML experiment tracking
- PostgreSQL schema in `data/init_database.sql`

### Contact & Issues

- **GitHub Issues**: For bug reports and feature requests
- **Email**: support@swasthya.example.com
- **Interactive API Docs**: Available at each service's `/docs` endpoint

## 🗺️ Roadmap

### ✅ Completed Features

- ✅ Multi-agent AI system (6 agents + orchestrator)
- ✅ MLflow integration for ML lifecycle
- ✅ Federated Learning for privacy-preserving multi-site training
- ✅ Docker containerization (18 services)
- ✅ Comprehensive documentation suite (13 guides)
- ✅ PostgreSQL database with complete schema
- ✅ RESTful APIs with OpenAPI documentation
- ✅ Hybrid deployment architecture

### 🚧 Planned Enhancements

- [ ] Advanced RL for dynamic resource allocation
- [ ] Integration with EHR systems (HL7/FHIR)
- [ ] Mobile app for clinicians and staff
- [ ] Real-time predictive analytics dashboard
- [ ] Kubernetes deployment manifests
- [ ] Advanced NLP for clinical notes extraction
- [ ] Automated model retraining pipelines with drift detection
- [ ] Multi-language support for patient triage
- [ ] Advanced visualization for forecasting and scheduling
- [ ] Integration with ambulance routing systems

---

**Built with ❤️ for better healthcare delivery**

