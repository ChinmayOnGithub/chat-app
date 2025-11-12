pipeline {
  agent any
  
  triggers {
    // Run nightly at 2 AM
    cron('H 2 * * *')
  }
  
  environment {
    NODE_VERSION = '20'
  }
  
  stages {
    stage('Security Audit') {
      steps {
        echo '🔍 Running security audit...'
        sh 'npm audit --audit-level=moderate || true'
      }
    }
    
    stage('Dependency Check') {
      steps {
        echo '📦 Checking for outdated dependencies...'
        sh 'npm outdated || true'
      }
    }
    
    stage('Build Test') {
      steps {
        echo '🔨 Testing build process...'
        sh 'npm ci'
        sh 'npm run build'
      }
    }
    
    stage('Docker Build Test') {
      steps {
        echo '🐳 Testing Docker build...'
        sh 'docker build -t chat-app:jenkins-test .'
      }
    }
  }
  
  post {
    success {
      echo '✅ Nightly checks passed!'
    }
    failure {
      echo '❌ Nightly checks failed! Review the logs.'
    }
    always {
      // Clean up
      sh 'docker rmi chat-app:jenkins-test || true'
    }
  }
}
