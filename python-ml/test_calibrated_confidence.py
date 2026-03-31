"""
Test script to demonstrate calibrated confidence scoring
Shows how confidence reflects true prediction reliability
"""

import numpy as np
import json
from app.models.calibration import EnsembleVotingPredictor, calculate_confidence_level


def test_calibrated_confidence():
    """
    Test scenarios showing different confidence levels based on:
    1. Model agreement
    2. Probability magnitude
    """
    
    print("=" * 80)
    print("CALIBRATED CONFIDENCE SCORING TEST")
    print("=" * 80)
    print()
    
    # Initialize ensemble predictor
    predictor = EnsembleVotingPredictor("app/models/saved_models")
    
    # Load available models
    print("Loading trained models for ensemble...")
    algorithms = ['random_forest', 'gradient_boosting', 'xgboost', 'svm', 'logistic_regression']
    loaded_count = 0
    
    for algo in algorithms:
        if predictor.load_model(algo, None):
            loaded_count += 1
    
    print(f"✅ Loaded {loaded_count} models for ensemble voting\n")
    
    if loaded_count == 0:
        print("❌ No trained models found. Please train models first.")
        print("   Run: python -m uvicorn app.main:app --reload")
        print("   Then: POST to /api/ml/retrain with algorithm name")
        return
    
    # Test cases
    test_cases = [
        {
            "name": "SCENARIO 1: Well-Optimized Code (High Confidence)",
            "metrics": {
                "loc": 250,
                "complexity": 8,
                "dependencies": 2,
                "functions": 10,
                "classes": 3,
                "comments": 40,
                "complexity_per_loc": 0.032,
                "comment_ratio": 0.14,
                "functions_per_class": 3.3
            }
        },
        {
            "name": "SCENARIO 2: Messy Code (High Confidence)",
            "metrics": {
                "loc": 600,
                "complexity": 45,
                "dependencies": 12,
                "functions": 5,
                "classes": 4,
                "comments": 15,
                "complexity_per_loc": 0.075,
                "comment_ratio": 0.025,
                "functions_per_class": 1.25
            }
        },
        {
            "name": "SCENARIO 3: Ambiguous Code (Medium Confidence)",
            "metrics": {
                "loc": 350,
                "complexity": 18,
                "dependencies": 6,
                "functions": 7,
                "classes": 3,
                "comments": 25,
                "complexity_per_loc": 0.051,
                "comment_ratio": 0.067,
                "functions_per_class": 2.33
            }
        },
        {
            "name": "SCENARIO 4: Borderline Code (Low Confidence)",
            "metrics": {
                "loc": 400,
                "complexity": 20,
                "dependencies": 7,
                "functions": 6,
                "classes": 3,
                "comments": 30,
                "complexity_per_loc": 0.05,
                "comment_ratio": 0.070,
                "functions_per_class": 2.0
            }
        }
    ]
    
    # Run predictions
    for scenario in test_cases:
        print("\n" + "=" * 80)
        print(scenario["name"])
        print("=" * 80)
        
        metrics = scenario["metrics"]
        
        # Convert to numpy array
        metrics_array = np.array([[
            float(metrics['loc']),
            float(metrics['complexity']),
            float(metrics['dependencies']),
            float(metrics['functions']),
            float(metrics['classes']),
            float(metrics['comments']),
            float(metrics['complexity_per_loc']),
            float(metrics['comment_ratio']),
            float(metrics['functions_per_class'])
        ]])
        
        try:
            # Make ensemble prediction
            is_optimized, calibrated_confidence, voting_details = predictor.ensemble_predict(metrics_array)
            
            confidence_level = calculate_confidence_level(calibrated_confidence)
            
            print(f"\n📊 Input Metrics:")
            print(f"   LOC: {metrics['loc']}")
            print(f"   Complexity: {metrics['complexity']}")
            print(f"   Dependencies: {metrics['dependencies']}")
            print(f"   Comment Ratio: {metrics['comment_ratio']:.2%}")
            
            print(f"\n🎯 Prediction Results:")
            print(f"   Status: {'✅ OPTIMIZED' if is_optimized else '❌ UNOPTIMIZED'}")
            print(f"   Confidence Score: {calibrated_confidence:.1%}")
            print(f"   Confidence Level: {confidence_level}")
            
            print(f"\n🗳️ Model Voting Details:")
            print(f"   Models Used: {voting_details['num_models']}")
            print(f"   Agreement: {voting_details['model_agreement_percentage']}")
            
            print(f"\n📈 Individual Model Votes:")
            for model_name, vote in voting_details['votes'].items():
                prob = voting_details['probabilities'].get(model_name, 'N/A')
                vote_label = "✅ OPTIMIZED" if vote == 1 else "❌ UNOPTIMIZED"
                prob_label = f" ({prob*100:.1f}%)" if isinstance(prob, (int, float)) else ""
                print(f"   • {model_name.upper()}: {vote_label}{prob_label}")
            
            print(f"\n💡 Why This Confidence Level:")
            agreement_ratio = voting_details['agreement_ratio']
            
            if agreement_ratio >= 0.8:
                print(f"   ✅ High agreement ({agreement_ratio*100:.0f}%) → HIGH confidence")
                if is_optimized:
                    print(f"   ✅ All models agree code is well-optimized")
                else:
                    print(f"   ✅ All models agree code needs optimization")
            elif agreement_ratio >= 0.6:
                print(f"   ⚠️ Moderate agreement ({agreement_ratio*100:.0f}%) → MEDIUM confidence")
                print(f"   ⚠️ Some models disagree on assessment")
            else:
                print(f"   ❌ Low agreement ({agreement_ratio*100:.0f}%) → LOW confidence")
                print(f"   ❌ Models strongly disagree - prediction uncertain")
        
        except Exception as e:
            print(f"\n❌ Error during prediction: {e}")


def compare_confidence_before_after():
    """
    Show how confidence scoring improved
    """
    print("\n\n" + "=" * 80)
    print("CONFIDENCE SCORING IMPROVEMENT")
    print("=" * 80)
    
    print("""
BEFORE (Misleading):
- Raw probability treated as confidence
- Example: 0.65 probability → 65% confidence
- Problem: Doesn't reflect true reliability or model agreement
- Issues:
  * Single model opinion treated as fact
  * No calibration for model uncertainty
  * High confidence even when models disagree
  * Misleading when model predictions are wrong

AFTER (Calibrated):
- Confidence based on:
  1. Model agreement (ensemble voting)
  2. Probability magnitude calibration
  3. Confidence dampening for uncertainty
  
- Scoring Logic:
  * 80%+ model agreement + extreme prob → HIGH confidence (70-95%)
  * 60-80% agreement + moderate prob → MEDIUM confidence (35-65%)
  * <60% agreement + uncertain prob → LOW confidence (20-40%)

- Example: 5 models voting
  * 5/5 agree code is optimized, prob=0.9 → 85% confidence ✅
  * 3/5 agree code is optimized, prob=0.7 → 40% confidence ⚠️
  * 2.5/5 agree (borderline), prob=0.55 → 25% confidence ❌

BENEFITS:
✅ Confidence reflects true prediction reliability
✅ High confidence = multiple models agree
✅ Low confidence = models disagree or uncertain
✅ Better decision-making for risky code assessment
✅ Proper handling of edge cases and ambiguous code
    """)


if __name__ == "__main__":
    print("\n🔧 Running Calibrated Confidence Scoring Tests...\n")
    
    try:
        test_calibrated_confidence()
        compare_confidence_before_after()
        
        print("\n\n" + "=" * 80)
        print("✅ TEST COMPLETE")
        print("=" * 80)
        print("""
📝 INTERPRETATION GUIDE:

Confidence Score Ranges:
- 80-95%: Very High - Multiple models strongly agree
- 65-80%: High - Models agree on assessment
- 50-65%: Medium - Moderate agreement or uncertain
- 35-50%: Low - Models partially disagree
- 20-35%: Very Low - Models strongly disagree

Red Flags (Low Confidence):
⚠️ When to investigate more:
  - Low confidence predictions might be incorrect
  - Code at boundaries needs manual review
  - Consider human review for edge cases
  - Use confidence score to prioritize reviews

Green Lights (High Confidence):
✅ Trust these predictions:
  - High confidence assessments are reliable
  - All models agree on risk level
  - Safe to use in automated pipelines
  - Good for CI/CD integration
        """)
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
