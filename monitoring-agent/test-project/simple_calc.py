#!/usr/bin/env python3
"""
Simple calculator utility
Basic arithmetic operations - now with additional features
"""

def add(a, b):
    """Add two numbers"""
    return a + b

def subtract(a, b): 
    """Subtract two numbers"""
    return a - b

def multiply(a, b):
    """Multiply two numbers"""
    return a * b

def divide(a, b):
    """Divide two numbers"""
    if b != 0:
        return a / b
    return 0

def power(a, b):
    """Calculate a to the power of b"""
    return a ** b

if __name__ == "__main__":
    # Enhanced test suite
    print("Calculator Test Suite")
    print(f"2 + 3 = {add(2, 3)}")
    print(f"5 - 2 = {subtract(5, 2)}")
    print(f"4 * 3 = {multiply(4, 3)}")
    print(f"10 / 2 = {divide(10, 2)}")
    print(f"2 ^ 3 = {power(2, 3)}")