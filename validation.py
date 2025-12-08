"""
Input validation schemas for Tajir POS
"""
from marshmallow import Schema, fields, validate, ValidationError
import re

class LoginSchema(Schema):
    """Schema for login validation."""
    email = fields.Email(required=True, error_messages={'required': 'Email is required'})
    password = fields.Str(required=True, validate=validate.Length(min=6), 
                         error_messages={'required': 'Password is required'})

class MobileLoginSchema(Schema):
    """Schema for mobile login validation."""
    mobile = fields.Str(required=True, validate=validate.Regexp(r'^\+?[1-9]\d{1,14}$'),
                       error_messages={'required': 'Mobile number is required'})
    otp = fields.Str(required=True, validate=validate.Length(equal=6),
                    error_messages={'required': 'OTP is required'})

class ShopCodeLoginSchema(Schema):
    """Schema for shop code login validation."""
    shop_code = fields.Str(required=True, validate=validate.Length(min=3, max=20),
                          error_messages={'required': 'Shop code is required'})
    password = fields.Str(required=True, validate=validate.Length(min=6),
                         error_messages={'required': 'Password is required'})

class ProductSchema(Schema):
    """Schema for product validation."""
    product_name = fields.Str(required=True, validate=validate.Length(min=1, max=100),
                             error_messages={'required': 'Product name is required'})
    rate = fields.Decimal(required=True, validate=validate.Range(min=0),
                         error_messages={'required': 'Rate is required'})
    type_id = fields.Int(required=True, validate=validate.Range(min=1),
                        error_messages={'required': 'Product type is required'})

class CustomerSchema(Schema):
    """Schema for customer validation."""
    customer_name = fields.Str(required=True, validate=validate.Length(min=1, max=100),
                              error_messages={'required': 'Customer name is required'})
    mobile = fields.Str(validate=validate.Regexp(r'^\+?[1-9]\d{1,14}$'))
    email = fields.Email()

class BillSchema(Schema):
    """Schema for bill validation."""
    customer_id = fields.Int(required=True, validate=validate.Range(min=1),
                            error_messages={'required': 'Customer is required'})
    items = fields.List(fields.Dict(), required=True, validate=validate.Length(min=1),
                       error_messages={'required': 'At least one item is required'})

def validate_input(schema_class, data):
    """Validate input data using schema."""
    try:
        schema = schema_class()
        return schema.load(data), None
    except ValidationError as err:
        return None, err.messages
