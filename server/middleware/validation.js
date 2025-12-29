import { body, validationResult } from "express-validator";

export const validateHost = [
  body("ip").isIP().withMessage("Invalid IP address"),
  body("osName")
    .isLength({ min: 2, max: 50 })
    .withMessage("OS Name must be between 2-50 characters"),
  body("osVersion")
    .isLength({ min: 2, max: 50 })
    .withMessage("OS Version must be between 2-50 characters"),
  body("loginId")
    .isLength({ min: 3, max: 50 })
    .withMessage("Login ID must be between 3-50 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];
