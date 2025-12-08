import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

class PlanManager:
    def __init__(self, config_file: str = "config.json"):
        """Initialize the plan manager with config file."""
        self.config_file = config_file
        self.config = self._load_config()
        
    def _load_config(self) -> Dict:
        """Load configuration from JSON file."""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Config file {self.config_file} not found. Using default config.")
            return self._get_default_config()
        except json.JSONDecodeError as e:
            print(f"Error parsing config file: {e}. Using default config.")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Return default configuration if config file is not available."""
        return {
            "pricing_plans": {
                "trial": {
                    "duration_days": 15,
                    "expiry_behavior": "lock_all"
                },
                "basic": {
                    "duration_days": 30,
                    "expiry_behavior": "lock_pro_features",
                    "pro_features": ["dashboard", "customer_search", "db_backup_restore"]
                },
                "pro": {
                    "lifetime": True,
                    "expiry_behavior": "never_expires"
                }
            }
        }
    
    def get_user_plan_status(self, user_plan: str, plan_start_date: str) -> Dict:
        """
        Get the current status of a user's plan.
        
        Args:
            user_plan: The user's plan type ('trial', 'basic', 'pro')
            plan_start_date: Start date in 'YYYY-MM-DD' format
            
        Returns:
            Dict containing plan status, enabled features, and expiry info
        """
        try:
            start_date = datetime.strptime(plan_start_date, "%Y-%m-%d").date()
            today = datetime.now().date()
            days_used = (today - start_date).days
            
            plan_config = self.config["pricing_plans"].get(user_plan, {})
            
            # Check if plan exists
            if not plan_config:
                return {
                    "valid": False,
                    "error": f"Unknown plan: {user_plan}",
                    "enabled_features": [],
                    "locked_features": [],
                    "expired": True
                }
            
            # Handle PRO plan (lifetime)
            if user_plan == "pro" and plan_config.get("lifetime", False):
                return {
                    "valid": True,
                    "plan": user_plan,
                    "days_used": days_used,
                    "days_remaining": "Unlimited",  # Changed from float('inf') to 'Unlimited'
                    "expired": False,
                    "enabled_features": self._get_all_features(),
                    "locked_features": [],
                    "expiry_behavior": "never_expires"
                }
            
            # Get plan duration
            duration_days = plan_config.get("duration_days", 0)
            days_remaining = max(0, duration_days - days_used)
            expired = days_remaining == 0
            
            # Determine enabled features based on plan and expiry
            enabled_features = self._get_enabled_features(user_plan, expired, plan_config)
            locked_features = self._get_locked_features(user_plan, expired, plan_config)
            
            return {
                "valid": True,
                "plan": user_plan,
                "days_used": days_used,
                "days_remaining": days_remaining,
                "expired": expired,
                "enabled_features": enabled_features,
                "locked_features": locked_features,
                "expiry_behavior": plan_config.get("expiry_behavior", "lock_all"),
                "start_date": plan_start_date,
                "expiry_date": (start_date + timedelta(days=duration_days)).strftime("%Y-%m-%d") if duration_days > 0 else None
            }
            
        except ValueError as e:
            return {
                "valid": False,
                "error": f"Invalid date format: {e}",
                "enabled_features": [],
                "locked_features": [],
                "expired": True
            }
    
    def _get_enabled_features(self, user_plan: str, expired: bool, plan_config: Dict) -> List[str]:
        """Get list of enabled features for the user's plan."""
        if user_plan == "pro":
            return self._get_all_features()
        
        if user_plan == "trial":
            if expired:
                return []  # All features locked after trial expiry
            else:
                return self._get_all_features()  # All features during trial
        
        if user_plan == "basic":
            if expired:
                # After expiry, only basic features are enabled
                return ["billing", "product_management", "customer_management"]
            else:
                # During first month, all features are enabled
                return self._get_all_features()
        
        # Default: return basic features
        return ["billing", "product_management", "customer_management"]
    
    def _get_locked_features(self, user_plan: str, expired: bool, plan_config: Dict) -> List[str]:
        """Get list of locked features for the user's plan."""
        enabled_features = self._get_enabled_features(user_plan, expired, plan_config)
        all_features = self._get_all_features()
        return [feature for feature in all_features if feature not in enabled_features]
    
    def _get_all_features(self) -> List[str]:
        """Get list of all available features."""
        return ["billing", "product_management", "customer_management", "dashboard", "customer_search", "db_backup_restore", "email_integration", "whatsapp_integration"]
    
    def is_feature_enabled(self, user_plan: str, plan_start_date: str, feature: str) -> bool:
        """Check if a specific feature is enabled for the user."""
        plan_status = self.get_user_plan_status(user_plan, plan_start_date)
        return feature in plan_status.get("enabled_features", [])
    
    def get_expiry_warnings(self, user_plan: str, plan_start_date: str) -> List[Dict]:
        """Get expiry warnings based on config settings."""
        plan_status = self.get_user_plan_status(user_plan, plan_start_date)
        
        if not plan_status.get("valid", False) or plan_status.get("expired", False):
            return []
        
        days_remaining = plan_status.get("days_remaining", 0)
        warning_days = self.config.get("ui_settings", {}).get("expiry_notifications", {}).get("warning_days", [5, 3, 1])
        
        warnings = []
        for warning_day in warning_days:
            if days_remaining == warning_day:
                warnings.append({
                    "type": "warning",
                    "days": days_remaining,
                    "message": self.config.get("ui_settings", {}).get("expiry_notifications", {}).get("warning_message", "").format(
                        plan=user_plan.title(),
                        days=days_remaining
                    )
                })
        
        return warnings
    
    def get_upgrade_options(self, current_plan: str) -> List[Dict]:
        """Get available upgrade options for the current plan."""
        upgrade_options = self.config.get("upgrade_options", {})
        available_upgrades = []
        
        if current_plan == "trial":
            if "trial_to_basic" in upgrade_options:
                available_upgrades.append(upgrade_options["trial_to_basic"])
            if "trial_to_pro" in upgrade_options:
                available_upgrades.append(upgrade_options["trial_to_pro"])
        elif current_plan == "basic":
            if "basic_to_pro" in upgrade_options:
                available_upgrades.append(upgrade_options["basic_to_pro"])
        
        return available_upgrades
    
    def get_feature_ui_config(self, feature: str) -> Dict:
        """Get UI configuration for a specific feature."""
        feature_def = self.config.get("feature_definitions", {}).get(feature, {})
        ui_settings = self.config.get("ui_settings", {}).get("locked_feature_style", {})
        
        return {
            "section_id": feature_def.get("section_id"),
            "nav_button": feature_def.get("nav_button"),
            "element_id": feature_def.get("element_id"),
            "locked_style": ui_settings
        }
    
    def get_plan_info(self, plan_name: str) -> Dict:
        """Get information about a specific plan."""
        return self.config.get("pricing_plans", {}).get(plan_name, {})
    
    def check_feature_access(self, user_id: int, feature: str) -> bool:
        """Check if a user has access to a specific feature."""
        # For now, we'll assume all users have access to all features
        # In a real implementation, you would check the user's plan from the database
        return True

# Global instance
plan_manager = PlanManager() 