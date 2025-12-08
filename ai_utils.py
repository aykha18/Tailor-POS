import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import json
from datetime import datetime, timedelta
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CustomerSegmentation:
    """
    Customer Segmentation using K-means clustering
    Implements RFM (Recency, Frequency, Monetary) analysis
    """
    
    def __init__(self, db_connection):
        self.db = db_connection
        self.model = None
        self.scaler = None
        self.features_df = None
        
    def extract_customer_features(self):
        """Extract features for customer segmentation from existing data"""
        try:
                                    # Query to extract customer features from bills and customers tables
                        query = """
                        SELECT 
                            c.customer_id,
                            c.name as customer_name,
                            c.phone as customer_mobile,
                            c.customer_type,
                            c.city as customer_city,
                            c.area as customer_area,
                            COUNT(b.bill_id) as total_orders,
                            COALESCE(SUM(b.total_amount), 0) as total_spent,
                            COALESCE(AVG(b.total_amount), 0) as avg_order_value,
                            MAX(b.bill_date) as last_order_date,
                            CASE 
                                WHEN MAX(b.bill_date) IS NOT NULL 
                                THEN (NOW()::date - MAX(b.bill_date)::date)
                                ELSE 999 
                            END as days_since_last_order,
                            COUNT(DISTINCT b.bill_date::date) as unique_visit_days,
                            MIN(b.bill_date) as first_order_date,
                            CASE 
                                WHEN MAX(b.bill_date) IS NOT NULL AND MIN(b.bill_date) IS NOT NULL 
                                THEN (MAX(b.bill_date)::date - MIN(b.bill_date)::date)
                                ELSE 0 
                            END as customer_lifetime_days
                        FROM customers c
                        LEFT JOIN bills b ON c.customer_id = b.customer_id
                        GROUP BY c.customer_id, c.name, c.phone, c.customer_type, c.city, c.area
                        HAVING COUNT(b.bill_id) > 0
                        ORDER BY total_spent DESC
                        """
            
            logger.info("Extracting customer features from database...")
            features_df = pd.read_sql(query, self.db)
            
            if features_df.empty:
                logger.warning("No customer data found for segmentation")
                return None
                
            logger.info(f"Extracted features for {len(features_df)} customers")
            return features_df
            
        except Exception as e:
            logger.error(f"Error extracting customer features: {e}")
            return None
    
    def engineer_features(self, features_df):
        """Create additional features for better segmentation"""
        if features_df is None:
            return None
        
        try:
            logger.info("Engineering additional features...")
            
            # Create RFM features
            features_df['recency'] = features_df['days_since_last_order'].fillna(999)
            features_df['frequency'] = features_df['total_orders'].fillna(0)
            features_df['monetary'] = features_df['total_spent'].fillna(0)
            
            # Create customer value score (RFM scoring)
            features_df['customer_value_score'] = (
                features_df['recency'].rank(ascending=False, pct=True) * 0.2 +
                features_df['frequency'].rank(ascending=True, pct=True) * 0.4 +
                features_df['monetary'].rank(ascending=True, pct=True) * 0.4
            )
            
            # Create spending categories
            features_df['spending_category'] = pd.cut(
                features_df['total_spent'],
                bins=[0, 100, 500, 1000, float('inf')],
                labels=['Low', 'Medium', 'High', 'VIP']
            )
            
            # Create frequency categories
            features_df['frequency_category'] = pd.cut(
                features_df['total_orders'],
                bins=[0, 2, 5, 10, float('inf')],
                labels=['Rare', 'Occasional', 'Regular', 'Frequent']
            )
            
            # Create recency categories
            features_df['recency_category'] = pd.cut(
                features_df['days_since_last_order'],
                bins=[0, 30, 90, 180, float('inf')],
                labels=['Recent', 'Active', 'At-Risk', 'Churned']
            )
            
            # Calculate average order frequency (days between orders)
            features_df['avg_order_frequency'] = np.where(
                features_df['total_orders'] > 1,
                features_df['customer_lifetime_days'] / (features_df['total_orders'] - 1),
                999  # For customers with only 1 order
            )
            
            # Create customer type score
            features_df['customer_type_score'] = np.where(
                features_df['customer_type'] == 'Business', 1.2, 1.0
            )
            
            logger.info("Feature engineering completed successfully")
            return features_df
            
        except Exception as e:
            logger.error(f"Error in feature engineering: {e}")
            return None
    
    def train_segmentation_model(self, features_df):
        """Train customer segmentation model using K-means clustering"""
        if features_df is None:
            return None, None, None
        
        try:
            logger.info("Training customer segmentation model...")
            
            # Select features for clustering
            feature_columns = [
                'total_orders', 'total_spent', 'avg_order_value', 
                'days_since_last_order', 'customer_value_score',
                'avg_order_frequency', 'customer_type_score'
            ]
            
            # Prepare features
            X = features_df[feature_columns].fillna(0)
            
            # Scale features
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            
            # Train K-means model
            self.model = KMeans(n_clusters=5, random_state=42, n_init=10)
            segments = self.model.fit_predict(X_scaled)
            
            # Add segments to features
            features_df['segment'] = segments
            features_df['segment_label'] = self.get_segment_labels(segments)
            
            # Store features for later use
            self.features_df = features_df
            
            logger.info("Model training completed successfully")
            return features_df, self.model, self.scaler
            
        except Exception as e:
            logger.error(f"Error training segmentation model: {e}")
            return None, None, None
    
    def get_segment_labels(self, segments):
        """Convert numeric segments to meaningful labels"""
        segment_mapping = {
            0: 'Loyal VIPs',
            1: 'Regular Customers', 
            2: 'At-Risk Customers',
            3: 'New Customers',
            4: 'Occasional Buyers'
        }
        return [segment_mapping.get(seg, 'Unknown') for seg in segments]
    
    def get_segment_insights(self, features_df):
        """Generate insights for each customer segment"""
        if features_df is None:
            return []
        
        try:
            insights = []
            
            for segment_label in features_df['segment_label'].unique():
                segment_data = features_df[features_df['segment_label'] == segment_label]
                
                insight = {
                    'label': segment_label,
                    'count': len(segment_data),
                    'total_spent': segment_data['total_spent'].sum(),
                    'avg_order_value': segment_data['avg_order_value'].mean(),
                    'avg_orders': segment_data['total_orders'].mean(),
                    'avg_days_since_order': segment_data['days_since_last_order'].mean(),
                    'characteristics': self.get_segment_characteristics(segment_label, segment_data)
                }
                
                insights.append(insight)
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating segment insights: {e}")
            return []
    
    def get_segment_characteristics(self, segment_label, segment_data):
        """Get characteristics for each segment"""
        characteristics = []
        
        if segment_label == 'Loyal VIPs':
            characteristics = [
                'High spending customers with frequent visits',
                'Long-term relationship with the business',
                'High average order value',
                'Most valuable customer segment'
            ]
        elif segment_label == 'Regular Customers':
            characteristics = [
                'Consistent purchasing behavior',
                'Moderate to high spending',
                'Regular visit patterns',
                'Stable customer base'
            ]
        elif segment_label == 'At-Risk Customers':
            characteristics = [
                'Declining visit frequency',
                'Long time since last order',
                'May need re-engagement strategies',
                'Potential for customer retention campaigns'
            ]
        elif segment_label == 'New Customers':
            characteristics = [
                'Recently acquired customers',
                'Limited purchase history',
                'High potential for growth',
                'Need onboarding and engagement'
            ]
        elif segment_label == 'Occasional Buyers':
            characteristics = [
                'Infrequent purchases',
                'Low to moderate spending',
                'May respond to promotional offers',
                'Opportunity for increased engagement'
            ]
        
        return characteristics
    
    def predict_customer_segment(self, customer_features):
        """Predict segment for a new customer"""
        if self.model is None or self.scaler is None:
            return None
        
        try:
            # Prepare features
            feature_columns = [
                'total_orders', 'total_spent', 'avg_order_value', 
                'days_since_last_order', 'customer_value_score',
                'avg_order_frequency', 'customer_type_score'
            ]
            
            X = customer_features[feature_columns].fillna(0).values.reshape(1, -1)
            X_scaled = self.scaler.transform(X)
            
            # Predict segment
            segment = self.model.predict(X_scaled)[0]
            segment_label = self.get_segment_labels([segment])[0]
            
            return {
                'segment': int(segment),
                'segment_label': segment_label
            }
            
        except Exception as e:
            logger.error(f"Error predicting customer segment: {e}")
            return None
    
    def get_recommendations(self, segment_label):
        """Get business recommendations for each segment"""
        recommendations = {
            'Loyal VIPs': [
                'Exclusive VIP programs and early access to new products',
                'Personalized service and dedicated account manager',
                'Premium loyalty rewards and special discounts',
                'Invitation to exclusive events and previews'
            ],
            'Regular Customers': [
                'Loyalty program enrollment and point accumulation',
                'Regular communication about new products and services',
                'Bundle offers and volume discounts',
                'Feedback surveys and improvement suggestions'
            ],
            'At-Risk Customers': [
                'Re-engagement campaigns with special offers',
                'Personalized outreach to understand concerns',
                'Win-back promotions and incentives',
                'Customer satisfaction surveys and feedback collection'
            ],
            'New Customers': [
                'Welcome package and onboarding information',
                'First-time buyer discounts and promotions',
                'Educational content about products and services',
                'Regular follow-up to ensure satisfaction'
            ],
            'Occasional Buyers': [
                'Seasonal promotions and limited-time offers',
                'Cross-selling and upselling opportunities',
                'Newsletter and product updates',
                'Referral programs and incentives'
            ]
        }
        
        return recommendations.get(segment_label, [])
    
    def export_segmentation_data(self, format='json'):
        """Export segmentation data in various formats"""
        if self.features_df is None:
            return None
        
        try:
            if format == 'json':
                return self.features_df.to_json(orient='records', date_format='iso')
            elif format == 'csv':
                return self.features_df.to_csv(index=False)
            elif format == 'excel':
                return self.features_df.to_excel(index=False)
            else:
                logger.warning(f"Unsupported export format: {format}")
                return None
                
        except Exception as e:
            logger.error(f"Error exporting segmentation data: {e}")
            return None

# Example usage and testing
if __name__ == "__main__":
    # This section is for testing the module independently
    print("Customer Segmentation Module")
    print("=" * 40)
    print("This module provides customer segmentation using ML clustering")
    print("Import and use in your Flask application")

