(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DustlabMath = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const expressionCache = new Map();

    const INVALID_IDENTIFIER_PATTERN = /(?:^|[^A-Za-z_])(constructor|prototype|__proto__|window|document|globalThis|Function|this)\b/;
    const VALID_CHAR_PATTERN = /^[0-9+\-*/%^().,\sA-Za-z_]*$/;

    const MATH_CONTEXT = "const { sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, asinh, acosh, atanh, sqrt, abs, exp, log, pow, floor, ceil, round, min, max, sign, trunc, hypot } = Math;" +
        "const PI = Math.PI; const pi = Math.PI; const TAU = Math.PI * 2; const tau = Math.PI * 2;" +
        "const E = Math.E; const e = Math.E;";

    function sanitizeExpression(rawExpression) {
        const trimmed = rawExpression.trim();
        if (!trimmed) {
            throw new Error("Expression cannot be empty.");
        }

        const replacedExponents = trimmed.replace(/\^/g, "**");

        if (!VALID_CHAR_PATTERN.test(replacedExponents)) {
            throw new Error("Expression contains unsupported characters. Allowed: numbers, t, basic operators, parentheses, commas.");
        }

        if (INVALID_IDENTIFIER_PATTERN.test(replacedExponents)) {
            throw new Error("Expression uses forbidden keywords such as constructor or window.");
        }

        // Quick check for balanced parentheses
        let balance = 0;
        for (const char of replacedExponents) {
            if (char === "(") balance++;
            if (char === ")") {
                balance--;
                if (balance < 0) {
                    throw new Error("Parentheses are imbalanced.");
                }
            }
        }
        if (balance !== 0) {
            throw new Error("Parentheses are imbalanced.");
        }

        return replacedExponents;
    }

    function compileMathExpression(expression) {
        const cached = expressionCache.get(expression);
        if (cached) {
            return cached;
        }

        const sanitized = sanitizeExpression(expression);
        let evaluator;
        try {
            evaluator = new Function("t", `'use strict'; ${MATH_CONTEXT} return (${sanitized});`);
            // Validate compilation with a sample input to surface syntax errors early.
            const testValue = evaluator(0);
            if (!Number.isFinite(testValue)) {
                // The expression might still be valid, but ensure it can produce finite numbers for typical inputs.
                // Don't throw here; downstream evaluation will perform stricter checks per t.
            }
        } catch (error) {
            throw new Error(`Invalid math expression "${expression}": ${error.message}`);
        }

        expressionCache.set(expression, evaluator);
        return evaluator;
    }

    function compileEquationSet(xExpression, yExpression, zExpression) {
        return {
            fx: compileMathExpression(xExpression),
            fy: compileMathExpression(yExpression),
            fz: compileMathExpression(zExpression)
        };
    }

    function evaluateComponent(fn, t, label) {
        let value;
        try {
            value = fn(t);
        } catch (error) {
            throw new Error(`Failed to evaluate ${label}(t) at t=${t}: ${error.message}`);
        }
        if (!Number.isFinite(value)) {
            throw new Error(`${label}(t) returned a non-finite result at t=${t}.`);
        }
        return value;
    }

    function lerp(a, b, amount) {
        return a + (b - a) * amount;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function buildSampledCurve(equations, tMin, tMax, sampleCount) {
        const { fx, fy, fz } = equations;
        const points = [];
        const cumulativeDistances = [];

        if (sampleCount <= 1 || !Number.isFinite(tMin) || !Number.isFinite(tMax)) {
            throw new Error("Sample count must be greater than 1 and bounds must be finite.");
        }

        const step = (tMax - tMin) / (sampleCount - 1);
        let previousPoint = null;
        let accumulatedDistance = 0;

        for (let i = 0; i < sampleCount; i++) {
            const t = i === sampleCount - 1 ? tMax : tMin + step * i;
            const x = evaluateComponent(fx, t, "X");
            const y = evaluateComponent(fy, t, "Y");
            const z = evaluateComponent(fz, t, "Z");

            const currentPoint = { t, x, y, z };
            points.push(currentPoint);

            if (previousPoint) {
                const dx = currentPoint.x - previousPoint.x;
                const dy = currentPoint.y - previousPoint.y;
                const dz = currentPoint.z - previousPoint.z;
                accumulatedDistance += Math.hypot(dx, dy, dz);
            }

            cumulativeDistances.push(accumulatedDistance);
            previousPoint = currentPoint;
        }

        return { points, cumulativeDistances, totalLength: accumulatedDistance };
    }

    function generateUniformPoints(equations, tMin, tMax, pointCount) {
        const { fx, fy, fz } = equations;
        if (pointCount <= 0) {
            return [];
        }
        if (!Number.isFinite(tMin) || !Number.isFinite(tMax)) {
            throw new Error("Bounds must be finite numbers.");
        }

        if (pointCount === 1) {
            const tMid = tMin + (tMax - tMin) / 2;
            return [{
                t: tMid,
                x: evaluateComponent(fx, tMid, "X"),
                y: evaluateComponent(fy, tMid, "Y"),
                z: evaluateComponent(fz, tMid, "Z")
            }];
        }

        const step = (tMax - tMin) / (pointCount - 1);
        const uniformPoints = [];

        for (let i = 0; i < pointCount; i++) {
            const t = i === pointCount - 1 ? tMax : tMin + step * i;
            uniformPoints.push({
                t,
                x: evaluateComponent(fx, t, "X"),
                y: evaluateComponent(fy, t, "Y"),
                z: evaluateComponent(fz, t, "Z")
            });
        }

        return uniformPoints;
    }

    function generateAdaptivePoints(equations, tMin, tMax, pointCount) {
        if (pointCount <= 0) {
            return [];
        }
        if (pointCount === 1) {
            return generateUniformPoints(equations, tMin, tMax, pointCount);
        }

        const baseSamples = Math.max(pointCount * 4, 200);
        const sampleCount = Math.min(5000, Math.max(baseSamples, pointCount + 1));

        let sampled;
        try {
            sampled = buildSampledCurve(equations, tMin, tMax, sampleCount);
        } catch (error) {
            return generateUniformPoints(equations, tMin, tMax, pointCount);
        }

        const { points, cumulativeDistances, totalLength } = sampled;

        if (!Number.isFinite(totalLength) || totalLength < 1e-8) {
            return generateUniformPoints(equations, tMin, tMax, pointCount);
        }

        const result = [];
        const step = totalLength / (pointCount - 1);
        let sampleIndex = 0;

        for (let i = 0; i < pointCount; i++) {
            const targetDistance = i === pointCount - 1 ? totalLength : step * i;

            while (sampleIndex < cumulativeDistances.length - 2 && cumulativeDistances[sampleIndex + 1] < targetDistance) {
                sampleIndex++;
            }

            const currentPoint = points[sampleIndex];
            const currentDistance = cumulativeDistances[sampleIndex];

            if (targetDistance <= currentDistance || sampleIndex === points.length - 1) {
                result.push({ ...currentPoint });
                continue;
            }

            const nextPoint = points[sampleIndex + 1];
            const nextDistance = cumulativeDistances[sampleIndex + 1];
            const segmentLength = nextDistance - currentDistance;
            const amount = segmentLength <= 0 ? 0 : clamp((targetDistance - currentDistance) / segmentLength, 0, 1);

            result.push({
                t: lerp(currentPoint.t, nextPoint.t, amount),
                x: lerp(currentPoint.x, nextPoint.x, amount),
                y: lerp(currentPoint.y, nextPoint.y, amount),
                z: lerp(currentPoint.z, nextPoint.z, amount)
            });
        }

        // Ensure the last point is exactly the final sample for stability.
        result[result.length - 1] = { ...points[points.length - 1] };
        return result;
    }

    function normalizePoints(points) {
        if (!points.length) {
            return points;
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        points.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
            minZ = Math.min(minZ, point.z);
            maxZ = Math.max(maxZ, point.z);
        });

        const rangeX = maxX - minX;
        const rangeY = maxY - minY;
        const rangeZ = maxZ - minZ;
        const maxRange = Math.max(rangeX, rangeY, rangeZ);

        if (maxRange === 0) {
            return points.map(point => ({ x: 0, y: 0, z: 0, t: point.t }));
        }

        const scaleFactor = 80 / maxRange;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        return points.map(point => ({
            x: (point.x - centerX) * scaleFactor,
            y: (point.y - centerY) * scaleFactor,
            z: (point.z - centerZ) * scaleFactor,
            t: point.t
        }));
    }

    function safeProgress(t, tMin, tMax) {
        if (!Number.isFinite(t) || !Number.isFinite(tMin) || !Number.isFinite(tMax)) {
            return 0;
        }
        if (tMax === tMin) {
            return 0.5;
        }
        return clamp((t - tMin) / (tMax - tMin), 0, 1);
    }

    function clearExpressionCache() {
        expressionCache.clear();
    }

    return {
        compileMathExpression,
        compileEquationSet,
        generateAdaptivePoints,
        generateUniformPoints,
        normalizePoints,
        safeProgress,
        clearExpressionCache
    };
});
