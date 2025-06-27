#!/bin/bash

# 🚀 Podify Project Initialization Script
# This script sets up the complete Podify development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${PURPLE}=================================${NC}"
    echo -e "${PURPLE}🚀 PODIFY PROJECT SETUP${NC}"
    echo -e "${PURPLE}=================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/"
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    if ! command_exists git; then
        print_error "Git is not installed. Please install Git"
        exit 1
    fi
    
    # Check Node version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version 16+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "All prerequisites met!"
}

# Create project structure
create_structure() {
    print_step "Creating project structure..."
    
    # Main directories
    mkdir -p src/{types,lib,errors,utils}
    mkdir -p tests/{unit,integration,fixtures}
    mkdir -p examples
    mkdir -p docs
    mkdir -p scripts
    mkdir -p .github/{workflows,ISSUE_TEMPLATE}
    mkdir -p .vscode
    mkdir -p .husky
    
    print_success "Project structure created!"
}

# Initialize package.json
init_package() {
    print_step "Initializing package.json..."
    
    if [ ! -f "package.json" ]; then
        npm init -y > /dev/null
        print_success "package.json created!"
    else
        print_warning "package.json already exists, skipping..."
    fi
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    echo "📦 Installing production dependencies..."
    npm install node-fetch@^3.3.2 dotenv@^16.3.1
    
    echo "🔧 Installing development dependencies..."
    npm install -D \
        typescript@^5.2.2 \
        @types/node@^20.8.0 \
        ts-node@^10.9.1 \
        jest@^29.7.0 \
        @types/jest@^29.5.5 \
        ts-jest@^29.1.1 \
        eslint@^8.50.0 \
        @typescript-eslint/parser@^6.7.0 \
        @typescript-eslint/eslint-plugin@^6.7.0 \
        prettier@^3.0.3 \
        eslint-config-prettier@^9.0.0 \
        eslint-plugin-prettier@^5.0.0 \
        husky@^8.0.3 \
        lint-staged@^14.0.1 \
        typedoc@^0.25.2 \
        commitlint@^17.7.2 \
        @commitlint/config-conventional@^17.7.0
    
    print_success "Dependencies installed!"
}

# Setup Git hooks
setup_git_hooks() {
    print_step "Setting up Git hooks..."
    
    if [ -d ".git" ]; then
        npx husky install
        
        # Create hook files
        cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."
npx lint-staged
npx tsc --noEmit
echo "✅ Pre-commit checks passed!"
EOF

        cat > .husky/pre-push << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🚀 Running pre-push checks..."
npm test
npm run build
echo "✅ Pre-push checks passed!"
EOF

        chmod +x .husky/pre-commit .husky/pre-push
        
        print_success "Git hooks configured!"
    else
        print_warning "Not a Git repository, skipping Git hooks setup"
    fi
}

# Create configuration files
create_configs() {
    print_step "Creating configuration files..."
    
    # TypeScript config
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "**/*.test.ts"]
}
EOF

    # Jest config
    cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
EOF

    # ESLint config
    cat > .eslintrc.js << 'EOF'
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/'],
};
EOF

    # Prettier config
    cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
EOF

    # Commitlint config
    cat > .commitlintrc.js << 'EOF'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'revert']
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-max-length': [2, 'always', 72],
  },
};
EOF

    print_success "Configuration files created!"
}

# Create environment files
create_env_files() {
    print_step "Creating environment files..."
    
    cat > .env.example << 'EOF'
# 🚀 Podify Configuration Example

# RunPod API Configuration
RUNPOD_API_KEY=your_runpod_api_key_here
RUNPOD_BASE_URL=https://api.runpod.io

# Application Environment
NODE_ENV=development
LOG_LEVEL=info

# Development Settings
DEBUG_API_CALLS=false
MONITORING_ENABLED=true
AUTO_SCALING_ENABLED=false

# Timeouts (milliseconds)
DEFAULT_TIMEOUT=30000
JOB_TIMEOUT=300000
ENDPOINT_READY_TIMEOUT=600000
EOF

    cat > .env.test << 'EOF'
NODE_ENV=test
LOG_LEVEL=error
RUNPOD_API_KEY=test_key
TEST_TIMEOUT=60000
MONITORING_ENABLED=false
EOF

    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_success "Environment files created!"
    else
        print_warning ".env already exists, created .env.example only"
    fi
}

# Create basic source files
create_source_files() {
    print_step "Creating basic source files..."
    
    # Main index file
    cat > src/index.ts << 'EOF'
/**
 * 🚀 Podify - RunPod TypeScript Automation Library
 * 
 * Потужна бібліотека для автоматизації RunPod Serverless API
 */

export { RunPodClient } from './lib/client';
export { ServerlessManager } from './lib/serverless';
export { MonitoringService } from './lib/monitoring';

export * from './types';
export * from './errors';
EOF

    # Basic types
    cat > src/types/index.ts << 'EOF'
export interface RunPodConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface EndpointConfig {
  name: string;
  imageUri: string;
  gpuIds: string[];
  workersMin?: number;
  workersMax?: number;
  scalerType?: 'QUEUE_DELAY' | 'REQUEST_COUNT';
  scalerValue?: number;
}

export interface Endpoint {
  id: string;
  name: string;
  imageUri: string;
  workersCount: number;
  workersMin: number;
  workersMax: number;
  scalerType: string;
  scalerValue: number;
  gpuIds: string[];
}

export interface ServerlessJob {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  input?: any;
  output?: any;
  executionTime?: number;
}
EOF

    # Basic error classes
    cat > src/errors/index.ts << 'EOF'
export class PodifyError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'PodifyError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class APIError extends PodifyError {
  constructor(message: string, statusCode: number) {
    super(message, 'API_ERROR', statusCode);
    this.name = 'APIError';
  }
}

export class ValidationError extends PodifyError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
EOF

    # Basic test setup
    cat > tests/setup.ts << 'EOF'
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Setup test timeout
jest.setTimeout(30000);

// Mock console for clean tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
EOF

    print_success "Basic source files created!"
}

# Update package.json scripts
update_package_scripts() {
    print_step "Updating package.json scripts..."
    
    # Use Node.js to update package.json
    node -e "
    const pkg = require('./package.json');
    pkg.scripts = {
      'build': 'tsc',
      'dev': 'tsc --watch',
      'test': 'jest',
      'test:watch': 'jest --watch',
      'test:coverage': 'jest --coverage',
      'lint': 'eslint src --ext .ts --fix',
      'format': 'prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"',
      'prepare': 'husky install',
      'prepublishOnly': 'npm run build && npm test'
    };
    pkg.main = 'dist/index.js';
    pkg.types = 'dist/index.d.ts';
    pkg.files = ['dist', 'README.md', 'LICENSE'];
    pkg.keywords = ['runpod', 'serverless', 'gpu', 'typescript', 'automation'];
    require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
    "
    
    print_success "Package.json updated!"
}

# Create README
create_readme() {
    print_step "Creating README..."
    
    cat > README.md << 'EOF'
# 🚀 Podify

Потужна TypeScript бібліотека для автоматизації RunPod Serverless API

## 🚀 Quick Start

```bash
npm install podify
```

```typescript
import { RunPodClient, ServerlessManager } from 'podify';

const client = new RunPodClient({ apiKey: 'your-api-key' });
const manager = new ServerlessManager(client);

// Автоматичне розгортання
const { endpoint } = await manager.deployServerless({
  name: 'my-api',
  imageUri: 'your-docker-image',
  gpuIds: ['NVIDIA GeForce RTX 4090'],
});
```

## 📚 Features

- ✅ Повне управління Serverless endpoints
- ✅ Batch processing задач
- ✅ Автоматичне масштабування
- ✅ Моніторинг та алерти
- ✅ TypeScript підтримка
- ✅ Error handling та retry логіка

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test

# Build
npm run build
```

## 📖 Documentation

See [docs/](./docs/) for detailed documentation.

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

MIT
EOF
    
    print_success "README created!"
}

# Final setup
final_setup() {
    print_step "Performing final setup..."
    
    # Create .gitignore if it doesn't exist
    if [ ! -f ".gitignore" ]; then
        cat > .gitignore << 'EOF'
# Environment files
.env/
.env
.env.local
.env.*.local

# Dependencies
node_modules/
npm-debug.log*

# Build outputs
dist/
*.tsbuildinfo

# Compiled files
*.js
*.d.ts

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Coverage
coverage/
EOF
    fi
    
    # Build the project to check everything works
    print_step "Testing build..."
    if npm run build > /dev/null 2>&1; then
        print_success "Build test passed!"
    else
        print_warning "Build test failed, but project setup is complete"
    fi
}

# Main execution
main() {
    print_header
    
    check_prerequisites
    create_structure
    init_package
    install_dependencies
    setup_git_hooks
    create_configs
    create_env_files
    create_source_files
    update_package_scripts
    create_readme
    final_setup
    
    echo ""
    echo -e "${GREEN}🎉 Podify project setup completed successfully!${NC}"
    echo ""
    echo -e "${CYAN}📋 Next steps:${NC}"
    echo -e "1. ${YELLOW}Add your RunPod API key to .env${NC}"
    echo -e "2. ${YELLOW}Start development: npm run dev${NC}"
    echo -e "3. ${YELLOW}Run tests: npm test${NC}"
    echo -e "4. ${YELLOW}Check examples/ directory${NC}"
    echo ""
    echo -e "${PURPLE}Happy coding! 🚀🇺🇦${NC}"
}

# Run main function
main "$@"

# # Створити новий проект
# mkdir podify && cd podify

# # Скопіювати init скрипт і запустити
# chmod +x init-project.sh
# ./init-project.sh
