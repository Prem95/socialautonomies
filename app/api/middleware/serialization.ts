import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle BigInt serialization in JSON responses
 * This is needed because JSON.stringify cannot handle BigInt values natively
 */
export const handleBigIntSerialization = (_req: Request, res: Response, next: NextFunction): void => {
  // Store the original res.json method
  const originalJson = res.json;
  
  // Override the res.json method to handle BigInt serialization
  res.json = function(body): Response {
    // Replace BigInt values with their string representation
    const serialized = JSON.stringify(body, (_, value) => 
      typeof value === 'bigint' ? value.toString() : value
    );
    
    // Set the content-type and send the serialized response
    res.setHeader('Content-Type', 'application/json');
    res.send(serialized);
    
    return res;
  };
  
  next();
}; 