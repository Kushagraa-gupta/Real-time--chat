import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { updateProfileSchema } from '../lib/validators';

export const searchUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const searchQuery = typeof search === 'string' ? search.trim() : '';

    if (!searchQuery) {
      // Return a default list of recent users or empty list
      const users = await prisma.user.findMany({
        where: {
          NOT: { id: currentUserId },
        },
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          status: true,
          lastSeen: true,
        },
        take: 10,
      });
      return res.json({ users });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { NOT: { id: currentUserId } },
          {
            OR: [
              { username: { contains: searchQuery, mode: 'insensitive' } },
              { email: { contains: searchQuery, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        status: true,
        lastSeen: true,
      },
      take: 20,
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = updateProfileSchema.parse(req.body);

    if (validatedData.username) {
      const usernameExists = await prisma.user.findFirst({
        where: {
          username: validatedData.username,
          NOT: { id: currentUserId },
        },
      });
      if (usernameExists) {
        return res.status(400).json({ error: 'Username already in use' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: validatedData,
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        status: true,
      },
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const handleFileUpload = (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Construct URL for the uploaded file
  const serverUrl = `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${serverUrl}/uploads/${req.file.filename}`;

  res.json({
    message: 'File uploaded successfully',
    fileUrl,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
};
