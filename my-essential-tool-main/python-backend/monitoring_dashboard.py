"""
Model Monitoring Dashboard Script
CLI tool for monitoring, managing, and controlling model deployments.
Run: python monitoring_dashboard.py
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import sys
from tabulate import tabulate

# Configuration
API_BASE_URL = "http://localhost:4000"
MONITOR_CONFIG = {
    "refresh_interval_seconds": 30,
    "drift_threshold": 0.3,
    "error_rate_threshold": 0.1,
    "latency_threshold_ms": 1000
}


class MonitoringDashboard:
    """Interactive monitoring dashboard for model management"""
    
    def __init__(self, api_url: str = API_BASE_URL):
        self.api_url = api_url
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall system health"""
        try:
            response = requests.get(f"{self.api_url}/api/health")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Failed to get health status: {e}")
            return {}
    
    def get_model_health(self, model_type: Optional[str] = None) -> Dict[str, Any]:
        """Get detailed model health"""
        try:
            url = f"{self.api_url}/api/health/models"
            if model_type:
                url += f"?model_type={model_type}"
            response = requests.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Failed to get model health: {e}")
            return {}
    
    def get_model_versions(self, model_type: str) -> Dict[str, Any]:
        """Get all versions of a model"""
        try:
            response = requests.get(f"{self.api_url}/api/models/{model_type}/versions")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Failed to get model versions: {e}")
            return {}
    
    def get_model_metrics(self, model_name: str, model_version: str, hours: int = 1) -> Dict[str, Any]:
        """Get metrics for a specific model"""
        try:
            url = f"{self.api_url}/api/models/{model_name}/metrics?model_version={model_version}&hours={hours}"
            response = requests.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Failed to get metrics: {e}")
            return {}
    
    def register_model_version(self, name: str, model_type: str, version: str, 
                              parameters: Dict, is_default: bool = False) -> bool:
        """Register new model version"""
        try:
            payload = {
                "name": name,
                "model_type": model_type,
                "version": version,
                "parameters": parameters,
                "is_default": is_default,
                "description": f"Model {name} version {version}"
            }
            response = requests.post(f"{self.api_url}/api/models/register-version", json=payload)
            response.raise_for_status()
            print(f"✅ Registered model {name} v{version}")
            return True
        except Exception as e:
            print(f"❌ Failed to register model: {e}")
            return False
    
    def create_feature_flag(self, name: str, description: str = "", status: str = "disabled") -> bool:
        """Create a feature flag"""
        try:
            payload = {
                "name": name,
                "description": description,
                "status": status,
                "rollout_strategy": "percentage",
                "rollout_percentage": 0.0
            }
            response = requests.post(f"{self.api_url}/api/features/flags/create", json=payload)
            response.raise_for_status()
            print(f"✅ Created feature flag '{name}'")
            return True
        except Exception as e:
            print(f"❌ Failed to create feature flag: {e}")
            return False
    
    def get_feature_flag(self, name: str) -> Dict[str, Any]:
        """Get feature flag status"""
        try:
            response = requests.get(f"{self.api_url}/api/features/flags/{name}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Failed to get feature flag: {e}")
            return {}
    
    def check_feature_enabled(self, name: str, user_id: Optional[str] = None) -> bool:
        """Check if feature is enabled"""
        try:
            url = f"{self.api_url}/api/features/check/{name}"
            if user_id:
                url += f"?user_id={user_id}"
            response = requests.get(url)
            response.raise_for_status()
            result = response.json()
            return result.get("enabled", False)
        except Exception as e:
            print(f"❌ Failed to check feature: {e}")
            return False
    
    def update_feature_flag(self, name: str, **kwargs) -> bool:
        """Update feature flag"""
        try:
            response = requests.put(f"{self.api_url}/api/features/flags/{name}", json=kwargs)
            response.raise_for_status()
            print(f"✅ Updated feature flag '{name}'")
            return True
        except Exception as e:
            print(f"❌ Failed to update feature flag: {e}")
            return False
    
    def start_canary_deployment(self, name: str, initial_percentage: float = 5.0) -> bool:
        """Start canary deployment"""
        try:
            url = f"{self.api_url}/api/features/flags/{name}/canary/start?initial_percentage={initial_percentage}"
            response = requests.post(url)
            response.raise_for_status()
            print(f"✅ Started canary deployment for '{name}' at {initial_percentage}%")
            return True
        except Exception as e:
            print(f"❌ Failed to start canary: {e}")
            return False
    
    def increment_canary_deployment(self, name: str) -> bool:
        """Increment canary deployment"""
        try:
            response = requests.post(f"{self.api_url}/api/features/flags/{name}/canary/increment")
            response.raise_for_status()
            result = response.json()
            new_percentage = result.get("new_traffic_percentage", 0)
            print(f"✅ Incremented canary for '{name}' to {new_percentage}%")
            return True
        except Exception as e:
            print(f"❌ Failed to increment canary: {e}")
            return False
    
    def rollback_model(self, model_name: str) -> bool:
        """Rollback model to previous version"""
        try:
            response = requests.post(f"{self.api_url}/api/models/{model_name}/rollback")
            response.raise_for_status()
            print(f"✅ Rolled back {model_name} to previous version")
            return True
        except Exception as e:
            print(f"❌ Failed to rollback: {e}")
            return False
    
    def detect_drift(self, model_name: str, model_version: str, 
                    reference_data: list, current_data: list) -> Dict[str, Any]:
        """Detect data drift"""
        try:
            payload = {
                "model_name": model_name,
                "model_version": model_version,
                "reference_data": reference_data,
                "current_data": current_data,
                "threshold": MONITOR_CONFIG["drift_threshold"]
            }
            response = requests.post(f"{self.api_url}/api/models/detect-drift", json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Failed to detect drift: {e}")
            return {}
    
    def display_health_dashboard(self):
        """Display system health dashboard"""
        print("\n" + "="*80)
        print("📊 MODEL MONITORING DASHBOARD")
        print("="*80)
        
        # Overall health
        health = self.get_health_status()
        status_icon = "🟢" if health.get("status") == "healthy" else \
                     "🟡" if health.get("status") == "degraded" else "🔴"
        print(f"\n{status_icon} Overall Status: {health.get('status', 'unknown').upper()}")
        print(f"   Total Models: {health.get('total_models', 0)}")
        print(f"   Healthy: {health.get('healthy_models', 0)}")
        print(f"   Unhealthy: {health.get('unhealthy_models', 0)}")
        
        # Model details
        model_health = self.get_model_health()
        if model_health.get("models"):
            print(f"\n📈 Model Status:")
            
            table_data = []
            for model in model_health.get("models", []):
                status_icon = "🟢" if model["status"] == "healthy" else \
                             "🟡" if model["status"] == "degraded" else "🔴"
                
                table_data.append([
                    f"{status_icon} {model['name']}",
                    model['version'],
                    model['status'].upper(),
                    f"{model['metrics']['total_predictions']}",
                    f"{model['metrics']['avg_latency_ms']:.1f}ms",
                    f"{model['metrics']['error_rate']*100:.1f}%"
                ])
            
            print(tabulate(
                table_data,
                headers=["Model", "Version", "Status", "Predictions", "Latency", "Error Rate"],
                tablefmt="grid"
            ))
        
        print("\n" + "="*80)
    
    def display_model_versions(self, model_type: str):
        """Display all versions of a model"""
        versions_data = self.get_model_versions(model_type)
        versions = versions_data.get("versions", [])
        
        if not versions:
            print(f"No versions found for {model_type}")
            return
        
        print(f"\n📦 {model_type.upper()} Model Versions:")
        
        table_data = []
        for v in versions:
            status_icon = "✅" if v.get("is_default") else "⏹️"
            table_data.append([
                f"{status_icon} {v['name']}",
                v['version'],
                v['status'],
                f"{v.get('canary_traffic', 0)*100:.1f}%",
                v['created_at'][:10]
            ])
        
        print(tabulate(
            table_data,
            headers=["Model", "Version", "Status", "Canary %", "Created"],
            tablefmt="grid"
        ))
    
    def display_feature_flags(self):
        """Display current feature flags (placeholder - would extend with list endpoint)"""
        print("\n🚩 Feature Flags:")
        print("   use_ml_forecast: ROLLOUT (5%)")
        print("   use_ml_pricing: DISABLED (0%)")
        print("   use_ml_promotions: ENABLED (100%)")
        print("   use_ml_assortment: ENABLED (100%)")


def print_menu():
    """Print interactive menu"""
    print("\n" + "="*80)
    print("🎛️  MODEL MONITORING CONTROL")
    print("="*80)
    print("\nOperations:")
    print("  1. View system health dashboard")
    print("  2. View model versions")
    print("  3. Register new model version")
    print("  4. Create feature flag")
    print("  5. Update feature flag")
    print("  6. Start canary deployment")
    print("  7. Increment canary deployment")
    print("  8. Rollback model")
    print("  9. Check data drift")
    print("  0. Exit")
    print("\n" + "="*80)


def main():
    """Interactive dashboard"""
    dashboard = MonitoringDashboard()
    
    print("\n🚀 Model Monitoring Dashboard started")
    print(f"API Endpoint: {API_BASE_URL}")
    
    while True:
        print_menu()
        choice = input("\nEnter choice (0-9): ").strip()
        
        if choice == "0":
            print("\n👋 Exiting...")
            sys.exit(0)
        
        elif choice == "1":
            dashboard.display_health_dashboard()
        
        elif choice == "2":
            model_type = input("Enter model type (forecast/pricing/promotion/assortment): ").strip()
            if model_type:
                dashboard.display_model_versions(model_type)
        
        elif choice == "3":
            name = input("Model name (e.g., forecast_v2): ").strip()
            model_type = input("Model type (forecast/pricing/promotion/assortment): ").strip()
            version = input("Version (e.g., 2.0.0): ").strip()
            is_default = input("Set as default? (y/n): ").strip().lower() == 'y'
            
            parameters = {
                "degree": 2,
                "alpha": 1.0
            }
            
            dashboard.register_model_version(name, model_type, version, parameters, is_default)
        
        elif choice == "4":
            name = input("Feature flag name: ").strip()
            description = input("Description: ").strip()
            dashboard.create_feature_flag(name, description)
        
        elif choice == "5":
            name = input("Feature flag name: ").strip()
            percentage = float(input("Traffic percentage (0-100): ").strip() or "0")
            status = input("Status (enabled/disabled/rollout): ").strip() or "rollout"
            
            dashboard.update_feature_flag(
                name,
                rollout_percentage=percentage/100.0,
                status=status
            )
        
        elif choice == "6":
            name = input("Feature flag name: ").strip()
            initial = float(input("Initial percentage (e.g., 5): ").strip() or "5")
            dashboard.start_canary_deployment(name, initial)
        
        elif choice == "7":
            name = input("Feature flag name: ").strip()
            dashboard.increment_canary_deployment(name)
        
        elif choice == "8":
            model_name = input("Model name to rollback: ").strip()
            dashboard.rollback_model(model_name)
        
        elif choice == "9":
            model_name = input("Model name: ").strip()
            model_version = input("Model version: ").strip()
            print("Enter reference data (comma-separated numbers):")
            ref_data = [float(x.strip()) for x in input().split(",")]
            print("Enter current data (comma-separated numbers):")
            curr_data = [float(x.strip()) for x in input().split(",")]
            
            result = dashboard.detect_drift(model_name, model_version, ref_data, curr_data)
            if result:
                print("\n📊 Drift Detection Results:")
                print(f"   Drift Detected: {result.get('drift_detected')}")
                print(f"   Drift Score: {result.get('drift_score', 0):.3f}")
                print(f"   Mean Shift: {result.get('mean_shift', 0):.3f}")
                print(f"   Std Shift: {result.get('std_shift', 0):.3f}")
        
        else:
            print("❌ Invalid choice")


if __name__ == "__main__":
    # If you have tabulate installed, import it; otherwise use simple formatting
    try:
        from tabulate import tabulate
    except ImportError:
        print("⚠️  Install tabulate for better formatting: pip install tabulate")
        def tabulate(data, headers, tablefmt):
            # Simple fallback formatting
            result = "  " + " | ".join(headers) + "\n"
            result += "  " + "-" * (sum(len(h) for h in headers) + len(headers)*3) + "\n"
            for row in data:
                result += "  " + " | ".join(str(x) for x in row) + "\n"
            return result
    
    main()
