import org.junit.Test;

import com.google.common.base.Strings;

public class TestFoo implements Runnable
{
    @Test
    public void testMe()
    {
        for (ClassLoader cl = TestFoo.class.getClassLoader(); cl != null; cl = cl.getParent()) {
            System.out.println("CL: " + cl);
        }

        Object bar = new Foo().bar();
        System.out.println(bar);
        System.out.println(Strings.class);
        System.out.println(Strings.class.equals(bar));
    }

    @Override
    public void run()
    {
        testMe();
    }
}
