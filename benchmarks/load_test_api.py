"""
CodeSync Django API Concurrent Load Test Benchmark
Measures API throughput (requests/sec) and response latency distribution (p50, p95, p99).
"""
import argparse
import concurrent.futures
import json
import os
import sys
import time
import urllib.request
import urllib.error


def percentile(sorted_list, p):
    if not sorted_list:
        return 0.0
    k = (len(sorted_list) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_list) - 1)
    d0 = sorted_list[f] * (c - k)
    d1 = sorted_list[c] * (k - f)
    return d0 + d1


def make_request(url, timeout=10.0):
    start = time.perf_counter()
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "CodeSync-LoadTest/1.0", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status = response.status
            response.read()
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            return True, status, elapsed_ms
    except urllib.error.HTTPError as e:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        return False, e.code, elapsed_ms
    except Exception:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        return False, 0, elapsed_ms


def run_benchmark(target_url, concurrency, total_requests):
    print("====================================================")
    print(" CodeSync API Load Test Benchmark")
    print(f" Target URL:        {target_url}")
    print(f" Concurrency:       {concurrency} workers")
    print(f" Total Requests:    {total_requests}")
    print("====================================================\n")

    latencies = []
    successes = 0
    failures = 0

    wall_start = time.perf_counter()

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [
            executor.submit(make_request, target_url) for _ in range(total_requests)
        ]
        for f in concurrent.futures.as_completed(futures):
            ok, status, elapsed = f.result()
            latencies.append(elapsed)
            if ok and 200 <= status < 400:
                successes += 1
            else:
                failures += 1

    wall_duration = time.perf_counter() - wall_start
    latencies.sort()

    rps = total_requests / wall_duration if wall_duration > 0 else 0

    results = {
        "targetUrl": target_url,
        "concurrency": concurrency,
        "totalRequests": total_requests,
        "successes": successes,
        "failures": failures,
        "durationSec": round(wall_duration, 2),
        "rps": round(rps, 1),
        "latenciesMs": {
            "min": round(latencies[0], 2) if latencies else 0,
            "p50": round(percentile(latencies, 50), 2),
            "p90": round(percentile(latencies, 90), 2),
            "p95": round(percentile(latencies, 95), 2),
            "p99": round(percentile(latencies, 99), 2),
            "max": round(latencies[-1], 2) if latencies else 0,
        },
    }

    print("\n================== RESULTS ==================")
    print(f"Total Completed:  {total_requests} in {results['durationSec']}s")
    print(f"Throughput:       {results['rps']} req/sec")
    print(f"Success / Fail:   {successes} / {failures}")
    print("Latency Distribution:")
    print(f"  Min: {results['latenciesMs']['min']} ms")
    print(f"  p50: {results['latenciesMs']['p50']} ms")
    print(f"  p90: {results['latenciesMs']['p90']} ms")
    print(f"  p95: {results['latenciesMs']['p95']} ms")
    print(f"  p99: {results['latenciesMs']['p99']} ms")
    print(f"  Max: {results['latenciesMs']['max']} ms")
    print("=============================================\n")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CodeSync API Load Test")
    parser.add_argument("--url", default="http://127.0.0.1:8000/health/")
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--requests", type=int, default=100)
    parser.add_argument("--json-out", default=None)

    args = parser.parse_args()
    res = run_benchmark(args.url, args.concurrency, args.requests)
    if args.json_out:
        with open(args.json_out, "w") as f:
            json.dump(res, f, indent=2)
