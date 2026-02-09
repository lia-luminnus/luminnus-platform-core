import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';

/**
 * v1.0: Wrapper to catch async errors in Express routes and pass them to next(err)
 */
export const asyncErrorWrapper = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return asyncHandler(fn);
};
