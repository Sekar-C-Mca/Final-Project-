#include <iostream>
#include <vector>

// Demo C++ file for monitoring
class Calculator {
private:
    double value;
    
public:
    // Constructor
    Calculator() : value(0.0) {}
    
    // Add function with enhanced validation
    void add(double x) {
        if (x > 0) {
            value += x;
            std::cout << "Added: " << x << std::endl;
        } else {
            std::cout << "Warning: Adding negative value" << std::endl;
        }
    }
    
    // Multiply function with complexity
    double multiply(double x, double y) {
        double result = 0;
        for (int i = 0; i < x; i++) {
            if (i % 2 == 0) {
                result += y;
            } else {
                result += y * 0.5;
            }
        }
        return result;
    }
    
    // Get current value with validation
    double getValue() {
        // Add input validation
        if (value < 0) {
            std::cout << "Warning: Negative value detected!" << std::endl;
        }
        return value;
    }
};

int main() {
    Calculator calc;
    calc.add(15.5);  // Increased value
    calc.add(-5.0);  // This will trigger warning
    
    std::cout << "Current value: " << calc.getValue() << std::endl;
    std::cout << "Multiply result: " << calc.multiply(4, 3.0) << std::endl;
    
    // Additional calculations
    calc.add(20.0);
    std::cout << "Final value: " << calc.getValue() << std::endl;
    
    return 0;
}