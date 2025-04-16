import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createJsonResponse } from './lambdaHandlerUtils';

const dynamoClient = new DynamoDBClient({});
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME!;
const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set.');
}

type PasswordRequirement = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

const passwordRequirements: PasswordRequirement[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    test: (password: string) => password.length >= 8,
  },
  {
    id: 'number',
    label: 'At least 1 number',
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    id: 'uppercase',
    label: 'At least 1 uppercase letter',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'At least 1 lowercase letter',
    test: (password: string) => /[a-z]/.test(password),
  },
];

const checkPasswordRequirements = (password: string) => {
  const results: Record<string, boolean> = {};
  passwordRequirements.forEach(({ id, test }) => {
    results[id] = test(password);
  });
  return results;
}

const isValidNewPassword = (password: string): boolean => {
  return Object.values(checkPasswordRequirements(password)).every(a => a);
}

export const signupHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!event.body) {
    return createJsonResponse(400, { message: 'Missing request body' });
  }

  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return createJsonResponse(400, { message: 'Email and password are required' });
    }

    // password requirement check
    if (!isValidNewPassword(password)) {
        return createJsonResponse(400, { message: 'Password requirement not met.' });
    }

    console.log('before get command')
    // Check if user already exists
    const getCommand = new GetCommand({
      TableName: USERS_TABLE_NAME,
      Key: { email },
    });
    const existingUser = await dynamoDocClient.send(getCommand);

    if (existingUser.Item) {
      return createJsonResponse(409, { message: 'User already exists' }); // 409 Conflict
    }
    console.log('after get command')

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user in DynamoDB
    const putCommand = new PutCommand({
      TableName: USERS_TABLE_NAME,
      Item: {
        email: email,
        hashedPassword: hashedPassword,
        createdAt: new Date().toISOString(),
      },
      ConditionExpression: 'attribute_not_exists(email)'
    });

    await dynamoDocClient.send(putCommand);

    return createJsonResponse(201, { message: 'User created successfully' });

  } catch (error: any) {
    console.error('Signup Error:', error);
    // Handle potential race condition if ConditionExpression fails
    if (error.name === 'ConditionalCheckFailedException') {
        return createJsonResponse(409, { message: 'User already exists (race condition)' });
    }
    return createJsonResponse(500, { message: 'Internal server error during signup' });
  }
};

export const loginHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!event.body) {
    return createJsonResponse(400, { message: 'Missing request body' });
  }

  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return createJsonResponse(400, { message: 'Email and password are required' });
    }

    // Get user from DynamoDB
    const getCommand = new GetCommand({
      TableName: USERS_TABLE_NAME,
      Key: { email },
    });
    const { Item: user } = await dynamoDocClient.send(getCommand);

    if (!user || !user.hashedPassword) {
      return createJsonResponse(401, { message: 'Invalid email or password' }); // Unauthorized
    }

    // Compare password hash
    const match = await bcrypt.compare(password, user.hashedPassword);

    if (!match) {
      return createJsonResponse(401, { message: 'Invalid email or password' }); // Unauthorized
    }

    // Generate JWT
    if (!JWT_SECRET) {
        console.error('Login Error: JWT_SECRET is not configured.');
        return createJsonResponse(500, { message: 'Internal server configuration error' });
    }
    const token = jwt.sign(
      { email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' } // Expires in 30 days
    );

    return createJsonResponse(200, { token: token });

  } catch (error) {
    console.error('Login Error:', error);
    return createJsonResponse(500, { message: 'Internal server error during login' });
  }
};

// Return login status
export const statusHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Validate JWT internally
  const token = event.headers?.Authorization?.split(' ')?.[1];

  if (!token) {
    return createJsonResponse(401, { message: 'Missing authorization token' });
  }

  if (!JWT_SECRET) {
    console.error('Status Error: JWT_SECRET is not configured.');
    return createJsonResponse(500, { message: 'Internal server configuration error' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    console.log('Token decoded successfully for status check:', decoded);
    const userEmail = decoded.email;

    if (!userEmail) {
        console.error('Token payload missing email:', decoded);
        return createJsonResponse(403, { message: 'Invalid token payload' });
    }
    return createJsonResponse(200, { user: { email: userEmail } });

  } catch (error) {
    console.error('Status Check Error:', error);
    return createJsonResponse(500, { message: 'Internal server error checking status' });
  }
};
