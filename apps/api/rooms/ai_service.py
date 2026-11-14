"""
CodeSync AI Error Explanation Service
Analyzes failed run code and stderr/stdout to provide root cause analysis and fixes.
Supports Gemini/OpenAI API when keys are configured, with built-in heuristic analysis fallback.
"""
import os
import re
import urllib.request
import urllib.error
import json
from typing import Dict, Any, Optional


def analyze_run_error(code: str, output: str, language: str, exit_code: Optional[int]) -> Dict[str, Any]:
    """
    Analyzes execution error and returns root-cause analysis and suggested fix.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            return call_gemini_api(code, output, language, gemini_key)
        except Exception:
            # Fallback to local heuristic analyzer on API error
            pass

    return local_heuristic_analysis(code, output, language, exit_code)


def call_gemini_api(code: str, output: str, language: str, api_key: str) -> Dict[str, Any]:
    """Calls Gemini API for intelligent error explanation."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    prompt = f"""You are an expert programming tutor in CodeSync. Analyze this failed {language} code execution.

CODE:
```{language}
{code}
```

TERMINAL OUTPUT:
```
{output}
```

Provide a concise, direct response with:
1. Root Cause: What caused the failure.
2. Explanation: Brief explanation of the error message.
3. Suggested Fix: Code snippet showing how to resolve it.
Keep your response helpful, concise, and structured in Markdown."""

    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 600,
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req, timeout=10.0) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return {
            "explanation": text,
            "model": "gemini-1.5-flash",
            "is_ai": True,
        }


def local_heuristic_analysis(code: str, output: str, language: str, exit_code: Optional[int]) -> Dict[str, Any]:
    """
    Built-in heuristic error analyzer for offline, testing, or unkeyed environments.
    Extracts stack traces, line numbers, and known error patterns.
    """
    output_lower = output.lower()

    # Python Patterns
    if language == "python":
        if "zerodivisionerror" in output_lower:
            return {
                "explanation": (
                    "### Root Cause: ZeroDivisionError\n"
                    "The program attempted to divide a number by zero (`x / 0` or `x % 0`), "
                    "which is mathematically undefined and raises an unhandled exception."
                ),
                "suggested_fix": (
                    "Guard the division with a conditional check or try-except block:\n\n"
                    "```python\n"
                    "if divisor != 0:\n"
                    "    result = value / divisor\n"
                    "else:\n"
                    "    result = 0  # or handle fallback\n"
                    "```"
                ),
                "model": "codesync-heuristic-analyzer",
                "is_ai": False,
            }

        if "nameerror" in output_lower:
            match = re.search(r"name '([^']+)' is not defined", output)
            var_name = match.group(1) if match else "variable"
            return {
                "explanation": (
                    f"### Root Cause: NameError\n"
                    f"The identifier `{var_name}` was referenced before being assigned or imported in the current scope."
                ),
                "suggested_fix": (
                    f"Ensure `{var_name}` is declared before use or imported properly:\n\n"
                    f"```python\n"
                    f"{var_name} = ...  # Define before accessing\n"
                    f"```"
                ),
                "model": "codesync-heuristic-analyzer",
                "is_ai": False,
            }

        if "syntaxerror" in output_lower or "indentationerror" in output_lower:
            return {
                "explanation": (
                    "### Root Cause: Syntax or Indentation Error\n"
                    "Python failed to parse the source code due to mismatched brackets, "
                    "missing colons (`:`), or inconsistent indentation tabs/spaces."
                ),
                "suggested_fix": (
                    "Check the indicated line number for missing parentheses, colons after `if/for/def`, "
                    "or mixed tabs and 4-space indentations."
                ),
                "model": "codesync-heuristic-analyzer",
                "is_ai": False,
            }

        if "typeerror" in output_lower:
            return {
                "explanation": (
                    "### Root Cause: TypeError\n"
                    "An operation or function was applied to an object of inappropriate type "
                    "(e.g., concatenating a string with an integer or calling a non-callable object)."
                ),
                "suggested_fix": (
                    "Verify variable types with `type()` or use explicit type conversion (e.g., `str(val)`)."
                ),
                "model": "codesync-heuristic-analyzer",
                "is_ai": False,
            }

    # C++ Patterns
    if language == "cpp":
        if "error: 'cout' was not declared in this scope" in output_lower:
            return {
                "explanation": (
                    "### Root Cause: Missing Namespace or Header\n"
                    "`cout` is declared in `<iostream>` inside the `std` namespace."
                ),
                "suggested_fix": (
                    "Include `<iostream>` and use `std::cout` or `using namespace std;`:\n\n"
                    "```cpp\n"
                    "#include <iostream>\n"
                    "using namespace std;\n"
                    "```"
                ),
                "model": "codesync-heuristic-analyzer",
                "is_ai": False,
            }

        if "error:" in output_lower:
            return {
                "explanation": (
                    "### Root Cause: C++ Compilation Error\n"
                    "The GCC compiler failed to compile the program. See compiler diagnostics in output."
                ),
                "suggested_fix": (
                    "Check for missing semicolons (`;`), undeclared variables, or mismatched curly braces."
                ),
                "model": "codesync-heuristic-analyzer",
                "is_ai": False,
            }

    # JavaScript Patterns
    if language == "javascript":
        if "referenceerror" in output_lower:
            return {
                "explanation": (
                    "### Root Cause: ReferenceError\n"
                    "A non-existent variable was referenced. In strict mode or modern JS, variables must be declared."
                ),
                "suggested_fix": (
                    "Declare variables using `const` or `let` before referencing them."
                ),
                "model": "codesync-heuristic-analyzer",
                "is_ai": False,
            }

    # General / Timeout / OOM
    if "timeout" in output_lower or exit_code == 124 or exit_code == 137:
        return {
            "explanation": (
                "### Root Cause: Execution Timeout (Wall-clock Limit Exceeded)\n"
                "The program did not terminate within the 10-second sandbox execution threshold. "
                "This typically indicates an infinite loop (`while True`) or blocked I/O."
            ),
            "suggested_fix": (
                "Ensure all loop termination conditions advance towards completion and have a bounded iteration count."
            ),
            "model": "codesync-heuristic-analyzer",
            "is_ai": False,
        }

    # Fallback generic explanation
    return {
        "explanation": (
            f"### Execution Failure (Exit Code: {exit_code if exit_code is not None else 'Unknown'})\n"
            "The program terminated with an error. Review the traceback and output lines above."
        ),
        "suggested_fix": (
            "Examine the last lines of the output to locate the failing line and inspect argument types."
        ),
        "model": "codesync-heuristic-analyzer",
        "is_ai": False,
    }
